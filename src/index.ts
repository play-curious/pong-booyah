import * as chip from "booyah/src/chip";
import * as running from "booyah/src/running";

interface Point {
  x: number;
  y: number;
}

const screenSize: Point = { x: 800, y: 800 };
const paddleMargin = 50;

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
canvas.setAttribute("width", screenSize.x.toString());
canvas.setAttribute("height", screenSize.y.toString());

const context = canvas.getContext("2d");

class Game extends chip.Composite {
  protected _onActivate(): void {
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
    context.fillStyle = "black";
    context.fillRect(0, 0, screenSize.x, screenSize.y);
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
    context.fillStyle = "white";

    context.beginPath();
    context.arc(this._position.x, this._position.y, ballRadius, 0, 2 * Math.PI);
    context.closePath();
    context.fill();
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
    context.fillStyle = "white";

    context.fillRect(
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

  protected _onActivate(): void {
    canvas.addEventListener("keydown", (event) => this._onKeyDown(event));
    canvas.addEventListener("keyup", (event) => this._onKeyUp(event));
  }

  private _onKeyDown(event: KeyboardEvent) {
    // console.log("down", event.code);

    if (event.code === this.leftKeyCode) this._leftDown = true;
    else if (event.code === this.rightKeyCode) this._rightDown = true;
  }

  private _onKeyUp(event: KeyboardEvent) {
    // console.log("up", event.code);

    if (event.code === this.leftKeyCode) this._leftDown = false;
    else if (event.code === this.rightKeyCode) this._rightDown = false;
  }

  protected _onTick(): void {
    const paddle = this._chipContext.paddle as Paddle;

    if (this._leftDown) paddle.moveLeft();
    else if (this._rightDown) paddle.moveRight();
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

const runner = new running.Runner({
  rootChip: new Game(),
});

runner.start();
