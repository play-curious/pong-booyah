import * as chip from "booyah/src/chip";
import * as running from "booyah/src/running";
import * as input from "booyah/src/input";

interface Point {
  x: number;
  y: number;
}

const screenSize: Point = { x: 800, y: 800 };
const paddleMargin = 50;

class Game extends chip.Composite {
  private _canvas: HTMLCanvasElement;
  private _renderingContext: CanvasRenderingContext2D;

  protected _onActivate(): void {
    // Setup canvas
    {
      this._canvas = document.getElementById(
        "game-canvas"
      ) as HTMLCanvasElement;
      this._canvas.setAttribute("width", screenSize.x.toString());
      this._canvas.setAttribute("height", screenSize.y.toString());

      this._renderingContext = this._canvas.getContext("2d");
    }

    const topPaddle = new Paddle(paddleMargin);
    this._activateChildChip(topPaddle);

    const topPaddleInput = new PaddleInput("ArrowLeft", "ArrowRight");
    this._activateChildChip(topPaddleInput, {
      context: {
        paddle: topPaddle,
      },
    });

    const bottomPaddle = new Paddle(screenSize.y - paddleMargin);
    this._activateChildChip(bottomPaddle);

    const bottomPaddleInput = new PaddleInput("KeyA", "KeyS");
    this._activateChildChip(bottomPaddleInput, {
      context: {
        paddle: bottomPaddle,
      },
    });

    const ball = new Ball();
    this._activateChildChip(ball);

    const physics = new Physics();
    this._activateChildChip(physics, {
      context: {
        ball,
        paddles: [topPaddle, bottomPaddle],
      },
    });

    this._draw();
  }

  protected _onTick(): void {
    this._draw();
  }

  protected _draw(): void {
    this._renderingContext.fillStyle = "black";
    this._renderingContext.fillRect(0, 0, screenSize.x, screenSize.y);
  }

  get defaultChildChipContext(): chip.ChipContextResolvable {
    return {
      canvas: this._canvas,
      renderingContext: this._renderingContext,
    };
  }
}

const ballRadius = 10;
const ballSpeed = 5;

class Ball extends chip.ChipBase {
  private _position: Point;
  private _velocity: number;
  private _angle: number; // in radians

  protected _onActivate(): void {
    this._position = { x: screenSize.x / 2, y: screenSize.y / 2 };
    this._angle = Math.random() * 2 * Math.PI;
    this._velocity = ballSpeed;

    this._draw();
  }

  protected _onTick(): void {
    this._draw();
  }

  protected _draw(): void {
    const cxt = this._chipContext.renderingContext as CanvasRenderingContext2D;

    cxt.fillStyle = "white";

    cxt.beginPath();
    cxt.arc(this._position.x, this._position.y, ballRadius, 0, 2 * Math.PI);
    cxt.closePath();
    cxt.fill();
  }

  get position(): Point {
    return this._position;
  }

  set position(value: Point) {
    this._position = value;
  }

  get angle(): number {
    return this._angle;
  }

  get velocity(): number {
    return this._velocity;
  }

  getVelocityAsVector(): Point {
    return {
      x: Math.cos(this._angle) * this._velocity,
      y: Math.sin(this._angle) * this._velocity,
    };
  }

  bounceVertical(newY: number) {
    this._position.y = newY;

    const vv = this.getVelocityAsVector();
    vv.y *= -1;
    this._angle = Math.atan2(vv.y, vv.x);
  }

  bounceHorizontal(newX: number) {
    this._position.x = newX;

    const vv = this.getVelocityAsVector();
    vv.x *= -1;
    this._angle = Math.atan2(vv.y, vv.x);
  }
}

const paddleSize: Point = { x: 100, y: 10 };
const paddleSpeed = 5;

class Paddle extends chip.ChipBase {
  private _position: Point;

  constructor(public readonly yValue: number) {
    super();
  }

  protected _onActivate(): void {
    this._position = { x: screenSize.x / 2, y: this.yValue };

    this._draw();
  }

  protected _onTick(): void {
    this._draw();
  }

  private _draw() {
    const cxt = this._chipContext.renderingContext as CanvasRenderingContext2D;

    cxt.fillStyle = "white";

    cxt.fillRect(
      this._position.x - paddleSize.x / 2,
      this._position.y - paddleSize.y / 2,
      paddleSize.x,
      paddleSize.y
    );
  }

  moveLeft() {
    this._position.x = Math.max(
      paddleSize.x / 2,
      this._position.x - paddleSpeed
    );
  }

  moveRight() {
    this._position.x = Math.min(
      screenSize.y - paddleSize.x / 2,
      this._position.x + paddleSpeed
    );
  }

  get position(): Point {
    return this._position;
  }
}

class PaddleInput extends chip.ChipBase {
  private _leftDown: boolean;
  private _rightDown: boolean;

  constructor(
    public readonly leftKeyCode: string,
    public readonly rightKeyCode: string
  ) {
    super();
  }

  protected _onTick(): void {
    const paddle = this._chipContext.paddle as Paddle;
    const keyboard = this._chipContext.keyboard as input.Keyboard;

    if (keyboard.keysDown[this.leftKeyCode]) paddle.moveLeft();
    else if (keyboard.keysDown[this.rightKeyCode]) paddle.moveRight();
  }
}

export class Physics extends chip.ChipBase {
  protected _onTick(): void {
    const ball = this._chipContext.ball as Ball;
    const paddles = this._chipContext.paddles as Paddle[];

    const oldPosition = ball.position;
    const delta = ball.getVelocityAsVector();
    const newPosition = {
      x: oldPosition.x + delta.x,
      y: oldPosition.y + delta.y,
    };

    // By default, move to the new position
    // May change later due to collision detected
    ball.position = newPosition;

    // Bounce off walls
    if (newPosition.y < ballRadius) {
      ball.bounceVertical(ballRadius);
    } else if (newPosition.y > screenSize.y - ballRadius) {
      ball.bounceVertical(screenSize.y - ballRadius);
    }

    if (newPosition.x < ballRadius) {
      ball.bounceHorizontal(ballRadius);
    } else if (newPosition.x > screenSize.x - ballRadius) {
      ball.bounceHorizontal(screenSize.x - ballRadius);
    }

    // Bounce off paddles
    for (const paddle of paddles) {
      // Check horizontal position
      if (
        newPosition.x > paddle.position.x - ballRadius - paddleSize.x / 2 &&
        newPosition.x < paddle.position.x + ballRadius + paddleSize.x / 2
      ) {
        // If going down
        if (
          delta.y > 0 &&
          oldPosition.y < paddle.position.y - ballRadius - paddleSize.y / 2 &&
          newPosition.y > paddle.position.y - ballRadius - paddleSize.y / 2
        ) {
          ball.bounceVertical(
            paddle.position.y - ballRadius - paddleSize.y / 2
          );
        }
        // If going up
        else if (
          delta.y < 0 &&
          oldPosition.y > paddle.position.y + ballRadius + paddleSize.y / 2 &&
          newPosition.y < paddle.position.y + ballRadius + paddleSize.y / 2
        ) {
          ball.bounceVertical(
            paddle.position.y + ballRadius + paddleSize.y / 2
          );
        }
      }
    }
  }
}

// Setup keyboard input in the root context
const rootContextChips = {
  keyboard: new input.Keyboard(document.getElementById("game-canvas")),
};
const rootChip = new chip.ContextProvider(rootContextChips, new Game());

const runner = new running.Runner({
  rootChip,
});

runner.start();
