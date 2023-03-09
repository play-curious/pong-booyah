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
  private _ball: Ball;
  private _paddle: Paddle;
  private _paddleInput: PaddleInput;

  protected _onActivate(): void {
    this._paddle = new Paddle();
    this._activateChildChip(this._paddle);

    this._paddleInput = new PaddleInput(this._paddle);
    this._activateChildChip(this._paddleInput);

    this._ball = new Ball(this._paddle);
    this._activateChildChip(this._ball);

    this._draw();
  }

  protected _onTick(): void {
    this._draw();
  }

  protected _draw(): void {
    context.fillStyle = "black";
    context.fillRect(0, 0, screenSize.x, screenSize.y);
  }
}

const ballRadius = 10;
const ballSpeed = 5;

class Ball extends chip.ChipBase {
  private _paddle: Paddle;

  private _position: Point;
  private _velocity: number;
  private _angle: number; // in radians

  constructor(paddle: Paddle) {
    super();

    this._paddle = paddle;
  }

  protected _onActivate(): void {
    this._position = { x: screenSize.x / 2, y: screenSize.y / 2 };
    this._angle = Math.random() * 2 * Math.PI;
    this._velocity = ballSpeed;

    this._draw();
  }

  protected _onTick(): void {
    const oldPosition = { x: this._position.x, y: this._position.y };

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

    // Check for paddle collision
    if (
      oldPosition.y < this._paddle.position.y - ballRadius - paddleSize.y / 2 &&
      this._position.y >
        this._paddle.position.y - ballRadius - paddleSize.y / 2 &&
      this._position.x > this._paddle.position.x - paddleSize.x / 2 &&
      this._position.x < this._paddle.position.x + paddleSize.x / 2
    ) {
      this._position.y = this._paddle.position.y - ballRadius;

      deltaY *= -1;
      this._angle = Math.atan2(deltaY, deltaX);
    }

    this._draw();
  }

  protected _draw(): void {
    context.fillStyle = "white";

    context.beginPath();
    context.arc(this._position.x, this._position.y, ballRadius, 0, 2 * Math.PI);
    context.closePath();
    context.fill();
  }
}

const paddleSize: Point = { x: 100, y: 10 };
const paddleSpeed = 5;

class Paddle extends chip.ChipBase {
  private _position: Point;

  protected _onActivate(): void {
    this._position = { x: screenSize.x / 2, y: screenSize.y - 50 };

    this._draw();
  }

  protected _onTick(): void {
    this._draw();
  }

  private _draw() {
    context.fillStyle = "white";

    context.fillRect(
      this._position.x - paddleSize.x / 2,
      this._position.y - paddleSize.y / 2,
      paddleSize.x,
      paddleSize.y
    );
  }

  moveLeft() {
    this._position.x -= paddleSpeed;
  }

  moveRight() {
    this._position.x += paddleSpeed;
  }

  get position(): Point {
    return this._position;
  }
}

class PaddleInput extends chip.ChipBase {
  private _paddle: Paddle;

  private _leftDown: boolean;
  private _rightDown: boolean;

  constructor(paddle: Paddle) {
    super();

    this._paddle = paddle;
  }

  protected _onActivate(): void {
    canvas.addEventListener("keydown", (event) => this._onKeyDown(event));
    canvas.addEventListener("keyup", (event) => this._onKeyUp(event));
  }

  private _onKeyDown(event: KeyboardEvent) {
    console.log("down", event.code);

    if (event.code === "ArrowLeft") this._leftDown = true;
    else if (event.code === "ArrowRight") this._rightDown = true;
  }

  private _onKeyUp(event: KeyboardEvent) {
    console.log("up", event.code);

    if (event.code === "ArrowLeft") this._leftDown = false;
    else if (event.code === "ArrowRight") this._rightDown = false;
  }

  protected _onTick(): void {
    if (this._leftDown) this._paddle.moveLeft();
    else if (this._rightDown) this._paddle.moveRight();
  }
}

const runner = new running.Runner({
  rootChip: new Game(),
});

runner.start();
