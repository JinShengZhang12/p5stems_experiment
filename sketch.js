let cutButton, crossButton, longButton, restartButton, resetButton;
let stemCut = false;
let stemPiece = null;

let hasSeenCross = false;
let hasSeenLong = false;

let inTank = false;
let waterProgress = 0; // 0 ~ 1 表示水上升比例
let resetting = false; // 是否正在复原动画
let resetAlpha = 255;  // 渐变透明度

// tank position
let tankX = 420, tankY = 180, tankW = 120, tankH = 160; // 高度从200减到160
let baseWaterHeight = 60; // 初始水位高度（原来20，现在改成60）

function setup() {
  createCanvas(600, 500);

  cutButton = createButton("剪切");
  cutButton.position(20, 20);
  cutButton.mousePressed(cutStem);

  crossButton = createButton("横切面");
  crossButton.position(80, 20);
  crossButton.mousePressed(()=>{ hasSeenCross = true; });

  longButton = createButton("纵切面");
  longButton.position(150, 20);
  longButton.mousePressed(()=>{ hasSeenLong = true; });

  restartButton = createButton("再看一次");
  restartButton.position(320, 20);
  restartButton.mousePressed(()=>{ 
    if (inTank) waterProgress = 0; 
  });

  resetButton = createButton("复原");
  resetButton.position(400, 20);
  resetButton.mousePressed(startResetAnimation);
}

function draw() {
  background(245);

  // 如果正在复原 → 渐隐
  if (resetting) {
    resetAlpha -= 10;
    if (resetAlpha <= 0) {
      performReset(); // 真正重置
      resetting = false;
    }
  } else if (resetAlpha < 255) {
    resetAlpha += 10; // 渐显
  }

  push();
  tint(255, resetAlpha); // 应用透明度给所有图形

  // 左侧原始茎
  drawOriginalStem();

  // 中央：横切面 & 纵切面
  if (hasSeenCross) drawCrossSection(250, 150, 60);
  if (hasSeenLong) drawLongSection(250, 320, 60, 140);

  // 右侧水槽
  drawTank();

  // 切下来的茎段
  if (stemPiece) {
    stemPiece.show();
    stemPiece.drag(hasSeenCross && hasSeenLong); // 必须先看完切面
    if (stemPiece.insideWater(tankX, tankY, tankW, tankH, baseWaterHeight)) {
      inTank = true;
      if (waterProgress < 1) {
        waterProgress += 0.0015; // 水逐渐上升（减半速度）
      }
    }
    fill(0);
    textAlign(CENTER);
    text("切下的茎段", stemPiece.x + stemPiece.w/2, stemPiece.y + stemPiece.h + 15);
  }

  // 如果在水槽中 → 更新切面显示
  if (inTank) {
    if (hasSeenLong) drawLongSectionWater(250, 320, 60, 140, waterProgress);
    if (hasSeenCross) drawCrossSectionWater(250, 150, 60, waterProgress);
  }

  pop();
}

// 原始茎
function drawOriginalStem() {
  fill(80, 200, 80);
  rect(80, 120, 40, 220);
  fill(0);
  textAlign(CENTER);
  text("原始茎", 100, 360);
}

// 横切面
function drawCrossSection(x, y, r) {
  fill(230, 255, 230);
  stroke(0);
  ellipse(x, y, r*2, r*2);

  for (let angle = 0; angle < TWO_PI; angle += PI/6) {
    let bx = x + cos(angle) * (r * 0.6);
    let by = y + sin(angle) * (r * 0.6);
    fill(100, 200, 100);
    ellipse(bx, by, 14, 14);
  }

  fill(200, 150, 100);
  ellipse(x, y, r*0.8, r*0.8);

  fill(0);
  noStroke();
  textAlign(CENTER);
  text("茎的横切面", x, y + r + 20);
}

// 横切面水染色
function drawCrossSectionWater(x, y, r, p) {
  noStroke();
  fill(160,100,200,120); // 紫色水
  for (let angle = 0; angle < TWO_PI; angle += PI/6) {
    let bx = x + cos(angle) * (r * 0.6);
    let by = y + sin(angle) * (r * 0.6);
    ellipse(bx, by, 14*p, 14*p);
  }
}

// 纵切面
function drawLongSection(x, y, w, h) {
  stroke(0);
  fill(230,255,230);
  rect(x-w/2, y-h/2, w, h);

  for (let i= -w/2+10; i<=w/2-10; i+=15) {
    stroke(120,200,120);
    line(x+i, y-h/2, x+i, y+h/2);
  }

  fill(0);
  noStroke();
  textAlign(CENTER);
  text("茎的纵切面", x, y + h/2 + 20);
}

// 纵切面水柱
function drawLongSectionWater(x, y, w, h, p) {
  noStroke();
  fill(160,100,200,150); // 紫色水
  rect(x-w/2, y+h/2 - h*p, w, h*p);
}

// 水槽
function drawTank() {
  stroke(0);
  noFill();
  rect(tankX, tankY, tankW, tankH);

  fill(160,100,200,120); // 紫色水
  rect(tankX, tankY+tankH-baseWaterHeight, tankW, baseWaterHeight);

  fill(0);
  noStroke();
  textAlign(CENTER);
  text("水槽", tankX + tankW/2, tankY + tankH + 20);
}

// ========== 茎段类 ==========
class StemPiece {
  constructor(x, y, w, h) {
    this.x = x; this.y = y;
    this.w = w; this.h = h;
    this.dragging = false;
    this.offsetX = 0; this.offsetY = 0;
  }

  show() {
    // 画成一个立体的圆柱
    fill(80,200,80);
    rect(this.x, this.y, this.w, this.h);
    fill(100,220,100);
    ellipse(this.x+this.w/2, this.y, this.w, 15); // 上圆面
    ellipse(this.x+this.w/2, this.y+this.h, this.w, 15); // 下圆面
  }

  drag(allowed) {
    if (allowed && this.dragging) {
      this.x = mouseX + this.offsetX;
      this.y = mouseY + this.offsetY;
    }
  }

  pressed() {
    if (mouseX > this.x && mouseX < this.x + this.w &&
        mouseY > this.y && mouseY < this.y + this.h) {
      this.dragging = true;
      this.offsetX = this.x - mouseX;
      this.offsetY = this.y - mouseY;
    }
  }

  released() { this.dragging = false; }

  // 只检测水区
  insideWater(tx, ty, tw, th, waterH) {
    let waterTop = ty + th - waterH;
    return (this.x > tx && this.x < tx+tw &&
            this.y+this.h > waterTop && this.y < ty+th);
  }
}

// 鼠标事件
function mousePressed() {
  if (stemPiece) stemPiece.pressed();
}
function mouseReleased() {
  if (stemPiece) stemPiece.released();
}
function cutStem() {
  if (!stemCut) {
    stemPiece = new StemPiece(430, 50, 40, 60); // 位置调高 y=50
    stemCut = true;
  }
}

// 开始复原动画
function startResetAnimation() {
  resetting = true;
  resetAlpha = 255;
}

// 真正复原
function performReset() {
  stemCut = false;
  stemPiece = null;
  hasSeenCross = false;
  hasSeenLong = false;
  inTank = false;
  waterProgress = 0;
  resetAlpha = 0; // 复原后从透明开始，再慢慢显现
}
