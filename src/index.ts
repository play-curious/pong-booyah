import * as chip from "booyah/src/chip";
import * as running from "booyah/src/running";

interface Point {
  x: number;
  y: number;
}

const screenSize: Point = { x: 800, y: 800 };

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
canvas.setAttribute("width", screenSize.x.toString());
canvas.setAttribute("height", screenSize.y.toString());

const context = canvas.getContext("2d");
// context.fillRect(0, 0, screenSize.x, screenSize.y);

class Game extends chip.Composite {
  protected _onTick(): void {
    // const x = Math.random() * size.x;
    // const y = Math.random() * size.y;
    // context.fillStyle = "green";
    // context.fillRect(x, y, 100, 100);
  }
}

const ballRadius = 10;
const ballSpeed = 3;

class Ball extends chip.ChipBase {
  private _position: Point;
  private _velocity: number;
  private _angle: number; // in radians

  protected _onActivate(): void {
    this._position = { x: screenSize.x / 2, y: 100 };
    this._angle = -Math.PI / 6; //Math.random() * 2 * Math.PI;
    this._velocity = ballSpeed;

    this._draw();
  }

  protected _onTick(): void {
    let deltaX = Math.cos(this._angle) * this._velocity;
    let deltaY = Math.sin(this._angle) * this._velocity;

    this._position.x += deltaX;
    this._position.y += deltaY;

    if (this._position.y < ballRadius) {
      this._position.y = ballRadius;

      deltaY *= -1;
      this._angle = Math.atan2(deltaY, deltaX);
    } else if (this._position.y > screenSize.y - ballRadius) {
      this._position.y = screenSize.y - ballRadius;

      deltaY *= -1;
      this._angle = Math.atan2(deltaY, deltaX);
    }

    if (this._position.x < ballRadius) {
      this._position.x = ballRadius;

      deltaX *= -1;
      this._angle = Math.atan2(deltaY, deltaX);
    } else if (this._position.x > screenSize.x - ballRadius) {
      this._position.x = screenSize.x - ballRadius;

      deltaX *= -1;
      this._angle = Math.atan2(deltaY, deltaX);
    }

    this._draw();
  }

  protected _draw(): void {
    context.fillStyle = "black";
    context.fillRect(0, 0, screenSize.x, screenSize.y);

    context.fillStyle = "white";

    context.beginPath();
    context.arc(this._position.x, this._position.y, ballRadius, 0, 2 * Math.PI);
    context.closePath();
    context.fill();
  }
}

const runner = new running.Runner({
  rootChip: new Ball(),
});

runner.start();
