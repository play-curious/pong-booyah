import * as chip from "booyah/src/chip";
import * as running from "booyah/src/running";
import * as tween from "booyah/src/tween";

import * as PIXI from "pixi.js";

class Game extends chip.Composite {
  private _container = new PIXI.Container();

  protected _onActivate(): void {
    const baseTexture = texture.baseTexture;

    const app = this.chipContext.app as PIXI.Application;
    this._container = new PIXI.Container();
    app.stage.addChild(this._container);

    const goalSprite = new PIXI.Sprite(texture);
    goalSprite.scale.set(0.3);
    app.stage.addChild(goalSprite);

    const tileCount = new PIXI.Point(10, 10);
    const tileSize = new PIXI.Point(
      baseTexture.width / tileCount.x,
      baseTexture.height / tileCount.y
    );

    const tileContainer = new PIXI.Container();
    tileContainer.position.set(0, goalSprite.height + 10);
    this._container.addChild(tileContainer);

    for (let i = 0; i < tileCount.x; i++) {
      for (let j = 0; j < tileCount.y; j++) {
        const tile = new Tile(baseTexture, tileSize, new PIXI.Point(i, j));
        this._activateChildChip(tile, {
          context: {
            container: tileContainer,
          },
        });
      }
    }
  }

  protected _onTerminate(): void {
    this.chipContext.app.removeChild(this._container);
  }
}

class Tile extends chip.Composite {
  private _tile: PIXI.Sprite;
  private _rotation: number;
  private _tween: tween.Tween<number, PIXI.Sprite>;

  constructor(
    private readonly _baseTexture: PIXI.BaseTexture,
    private readonly _tileSize: PIXI.Point,
    private readonly _index: PIXI.Point
  ) {
    super();
  }

  protected _onActivate(): void {
    const rect = new PIXI.Rectangle(
      this._index.x * this._tileSize.x,
      this._index.y * this._tileSize.y,
      this._tileSize.x,
      this._tileSize.y
    );
    const tileTexture = new PIXI.Texture(this._baseTexture, rect);

    this._tile = new PIXI.Sprite(tileTexture);
    this._tile.position.set(
      this._tileSize.x * (this._index.x + 0.5),
      this._tileSize.y * (this._index.y + 0.5)
    );
    this._tile.anchor.set(0.5);
    this._tile.interactive = true;
    this.chipContext.container.addChild(this._tile);

    this._subscribe(this._tile, "pointerup", this._onClick);

    this._activateChildChip(
      new chip.Sequence([
        new chip.Waiting(3000),
        new chip.Lambda(() => {
          this._rotation = (Math.floor(Math.random() * 4) * Math.PI) / 2;
          this._onRotate();
        }),
      ])
    );
  }

  protected _onTerminate(): void {
    this.chipContext.app.removeChild(this._container);
  }

  private _onClick() {
    this._rotation += Math.PI / 2;
    this._onRotate();
  }

  private _onRotate() {
    if (this._tween) this._terminateChildChip(this._tween);

    this._tween = new tween.Tween({
      obj: this._tile,
      property: "rotation",
      to: this._rotation,
    });
    this._activateChildChip(this._tween);
  }
}

// load the texture we need
let texture: PIXI.Texture;

async function startPixi() {
  texture = await PIXI.Assets.load(
    new URL("images/puppy.png", import.meta.url).pathname
  );

  // The application will create a renderer using WebGL, if possible,
  // with a fallback to a canvas render. It will also setup the ticker
  // and the root stage PIXI.Container
  const app = new PIXI.Application({ resizeTo: window });

  // The application will create a canvas element for you that you
  // can then insert into the DOM
  document.body.appendChild(app.view);

  // Setup keyboard input in the root context
  const rootContextChips = {};
  const rootChip = new chip.ContextProvider(rootContextChips, new Game());

  const runner = new running.Runner({
    rootChip,
    rootContext: {
      app,
    },
  });

  runner.start();
}

startPixi();
