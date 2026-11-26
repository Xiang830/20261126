let bgImage; // 儲存背景圖片 bg/3.png
let bgOffsetX = 0; // 記錄背景水平捲動偏移量（負值代表背景往左移動）
let characterSprite; // 儲存角色一的精靈圖
let walkSprite; // 儲存角色一的走路精靈圖
let magicSprite; // 儲存角色一的施法精靈圖
let magicEffectSprite; // 儲存角色一的魔法特效精靈圖
let char2StopSprite; // 儲存角色二的待機精靈圖 (2/stop/stop.png)
let char2ActionSprite; // 儲存角色二的動作精靈圖 (2/action/action.png)
let characterX; // 儲存角色一目前的水平中心位置
let isWalking = false; // 記錄角色是否已切換為走路動畫
let facingDirection = 1; // 記錄角色朝向（1 為右，-1 為左）
let isCasting = false; // 記錄角色是否正在播放施法動畫
let magicStartFrame = 0; // 記錄施法動畫開始時的畫面計數
let magicDirection = 1; // 記錄施法時鎖定的方向
let spaceIsDown = false; // 記錄空白鍵是否已按住以避免重複觸發
let activeEffects = []; // 儲存目前畫面上飛行中的魔法特效

// 數學測驗與回饋特效狀態變數
let wasNearChar2 = false; // 記錄前一影格是否已靠近角色二，避免重複出題
let currentQuiz = null; // 儲存目前題目 { question, options, answerIndex, selectedIndex, isCorrect }
let optionButtonBounds = []; // 儲存四個選項按鈕的點擊區域座標
let feedbackType = null; // 'fireworks' 或 'lightning'
let feedbackEndTime = 0; // 特效結束時間戳記 (millis)
let fireworksParticles = []; // 儲存煙火粒子陣列
let lastFireworkLaunch = 0; // 記錄上一發煙火發射時間

const frameCountInSprite = 10; // 設定角色一待機精靈圖包含的影格數
const frameWidth = 139.5; // 設定角色一待機每個影格的寬度（1395 除以 10）
const frameHeight = 196; // 設定角色一待機每個影格的高度
const walkFrameCount = 9; // 設定走路精靈圖包含的影格數
const walkFrameWidth = 1246 / walkFrameCount; // 計算走路動畫每格的寬度
const walkFrameHeight = 198; // 設定走路動畫每格的高度
const magicFrameCount = 4; // 設定施法精靈圖包含的影格數
const magicFrameWidth = 1039 / magicFrameCount; // 計算施法動畫每格的寬度
const magicFrameHeight = 146; // 設定施法動畫每格的高度
const effectFrameCount = 5; // 設定魔法特效精靈圖包含的影格數
const effectFrameWidth = 740 / effectFrameCount; // 計算魔法特效每格的寬度
const effectFrameHeight = 19; // 設定魔法特效每格的高度

// 角色二精靈圖參數設定
const char2StopFrameCount = 8; // 2/stop/stop.png 包含 8 張圖片
const char2StopFrameWidth = 699 / char2StopFrameCount; // 全寬 699 除以 8
const char2StopFrameHeight = 190; // 高度 190
const char2ActionFrameCount = 12; // 2/action/action.png 包含 12 張圖片
const char2ActionFrameWidth = 1627 / char2ActionFrameCount; // 全寬 1627 除以 12
const char2ActionFrameHeight = 171; // 高度 171

const framesPerStep = 8; // 設定動畫每隔幾個畫面更新一格

function preload() { // 在畫布建立前載入圖片資源
  bgImage = loadImage("bg/3.png"); // 載入背景圖片 bg/3.png
  characterSprite = loadImage("1/stop/stop.png"); // 載入角色一的十格精靈圖
  walkSprite = loadImage("1/walk/walk.png"); // 載入角色一的九格走路精靈圖
  magicSprite = loadImage("1/magic/magic.png"); // 載入角色一的四格施法精靈圖
  magicEffectSprite = loadImage("1/magic_effect/magic_effect.png"); // 載入五格魔法特效精靈圖
  char2StopSprite = loadImage("2/stop/stop.png"); // 載入角色二的待機精靈圖
  char2ActionSprite = loadImage("2/action/action.png"); // 載入角色二的動作精靈圖
}

function setup() { // 初始化畫布與繪圖模式
  createCanvas(windowWidth, windowHeight); // 建立符合視窗尺寸的畫布
  imageMode(CENTER); // 讓座標代表影格的中心點
  characterX = (width * 2) / 3; // 將角色初始位置設在畫布寬度的三分之二處
  frameRate(60); // 將動畫更新速率設定為每秒六十格
}

function draw() { // 每個畫面更新一次背景與角色
  background("#87CEEB"); // 預設底色避免圖片載入前空白

  // 計算單張背景圖片依畫布高度等比例縮放後的寬度（確保至少與畫布同寬以完整覆蓋畫面）
  const bgAspect = bgImage && bgImage.height > 0 ? bgImage.width / bgImage.height : 1;
  const singleBgWidth = max(width, height * bgAspect);
  const singleBgHeight = height;

  // 計算三張背景串接後的可捲動範圍
  const minBgOffset = width - singleBgWidth * 2;
  const maxBgOffset = singleBgWidth;
  const anchorX = (width * 2) / 3; // 角色在捲動模式下的基準水平位置

  const movingRight = keyIsDown(RIGHT_ARROW); // 檢查右方向鍵目前是否按住
  const movingLeft = keyIsDown(LEFT_ARROW); // 檢查左方向鍵目前是否按住
  isWalking = movingRight || movingLeft; // 沒有按住左右鍵時切回站立動畫
  const movementStep = constrain(width * 0.004, 2, 8); // 依畫布寬度計算適合不同裝置的移動速度

  // 維持角色高度為畫布高度的 1/3，寬度依原圖寬高比等比例縮放
  const characterScale = (height / 3) / frameHeight;
  const characterWidth = frameWidth * characterScale; // 計算角色基本顯示寬度
  const characterHeight = height / 3;

  if (movingRight) { // 按住右方向鍵
    isWalking = true;
    facingDirection = 1;
    if (characterX < anchorX) {
      characterX = min(anchorX, characterX + movementStep);
    } else if (bgOffsetX > minBgOffset) {
      bgOffsetX = max(minBgOffset, bgOffsetX - movementStep);
    } else {
      characterX += movementStep;
    }
  } else if (movingLeft) { // 按住左方向鍵
    isWalking = true;
    facingDirection = -1;
    if (characterX > anchorX) {
      characterX = max(anchorX, characterX - movementStep);
    } else if (bgOffsetX < maxBgOffset) {
      bgOffsetX = min(maxBgOffset, bgOffsetX + movementStep);
    } else {
      characterX -= movementStep;
    }
  }

  // 限制角色中心避免超出畫布左右邊界
  characterX = constrain(characterX, characterWidth / 2, width - characterWidth / 2);

  // 繪製三張左右串接的背景圖片（左 i=-1、中 i=0、右 i=1）
  if (bgImage) {
    push();
    imageMode(CORNER);
    for (let i = -1; i <= 1; i++) {
      const drawX = bgOffsetX + i * singleBgWidth;
      image(bgImage, drawX, 0, singleBgWidth, singleBgHeight);
    }
    pop();
  }

  // --- 繪製角色二（位於最左邊背景圖 i=-1 的中間） ---
  const leftBgLeftEdge = bgOffsetX - singleBgWidth;
  const char2X = leftBgLeftEdge + singleBgWidth / 2;

  // 計算角色一與角色二的水平距離，判斷是否「接近」
  const distanceToChar2 = abs(characterX - char2X);
  const triggerDistance = characterWidth * 1.8;
  const isNearChar2 = distanceToChar2 <= triggerDistance;

  // 偵測剛接近角色二的瞬間產生新題目；離開時清除題目框
  if (isNearChar2 && !wasNearChar2) {
    currentQuiz = generateMathQuiz();
  } else if (!isNearChar2 && wasNearChar2) {
    currentQuiz = null;
    optionButtonBounds = [];
  }
  wasNearChar2 = isNearChar2;

  // 根據距離切換角色二的精靈圖與影格資訊
  const char2ActiveSprite = isNearChar2 ? char2ActionSprite : char2StopSprite;
  const char2FrameCount = isNearChar2 ? char2ActionFrameCount : char2StopFrameCount;
  const char2FrameWidth = isNearChar2 ? char2ActionFrameWidth : char2StopFrameWidth;
  const char2FrameHeight = isNearChar2 ? char2ActionFrameHeight : char2StopFrameHeight;

  const char2FrameIndex = floor(frameCount / framesPerStep) % char2FrameCount;
  const char2SourceX = char2FrameIndex * char2FrameWidth;
  const char2DisplayWidth = char2FrameWidth * characterScale;
  const char2DisplayHeight = char2FrameHeight * characterScale;
  const char2Y = height - char2DisplayHeight / 2;

  if (char2ActiveSprite) {
    push();
    translate(char2X, char2Y);
    const char2Facing = characterX >= char2X ? 1 : -1;
    scale(char2Facing, 1);
    image(
      char2ActiveSprite,
      0,
      0,
      char2DisplayWidth,
      char2DisplayHeight,
      char2SourceX,
      0,
      char2FrameWidth,
      char2FrameHeight
    );
    pop();
  }

  // --- 繪製角色一 ---
  if (isCasting && frameCount - magicStartFrame >= magicFrameCount * framesPerStep) {
    isCasting = false;
    activeEffects.push({
      x: characterX + magicDirection * characterWidth / 2,
      y: height - characterHeight * 0.58,
      direction: magicDirection
    });
  }

  const activeSprite = isCasting ? magicSprite : isWalking ? walkSprite : characterSprite;
  const activeFrameCount = isCasting ? magicFrameCount : isWalking ? walkFrameCount : frameCountInSprite;
  const activeFrameWidth = isCasting ? magicFrameWidth : isWalking ? walkFrameWidth : frameWidth;
  const activeFrameHeight = isCasting ? magicFrameHeight : isWalking ? walkFrameHeight : frameHeight;
  const elapsedMagicFrames = frameCount - magicStartFrame;
  const frameIndex = isCasting ? floor(elapsedMagicFrames / framesPerStep) : floor(frameCount / framesPerStep) % activeFrameCount;
  const sourceX = frameIndex * activeFrameWidth;
  const activeWidth = activeFrameWidth * characterScale;
  const activeHeight = activeFrameHeight * characterScale;
  const characterY = height - activeHeight / 2;

  push();
  translate(characterX, characterY);
  scale(isCasting ? magicDirection : facingDirection, 1);
  image(activeSprite, 0, 0, activeWidth, activeHeight, sourceX, 0, activeFrameWidth, activeFrameHeight);
  pop();

  // --- 更新並繪製魔法特效 ---
  const effectScale = characterScale;
  const effectWidth = effectFrameWidth * effectScale;
  const effectHeight = effectFrameHeight * effectScale;
  const effectSpeed = max(6, width * 0.008);
  for (let effectIndex = activeEffects.length - 1; effectIndex >= 0; effectIndex--) {
    const effect = activeEffects[effectIndex];
    effect.x += effect.direction * effectSpeed;
    if (effect.x > width || effect.x < 0) {
      activeEffects.splice(effectIndex, 1);
      continue;
    }
    const effectFrameIndex = floor(frameCount / framesPerStep) % effectFrameCount;
    push();
    translate(effect.x, effect.y);
    scale(effect.direction, 1);
    image(magicEffectSprite, 0, 0, effectWidth, effectHeight, effectFrameIndex * effectFrameWidth, 0, effectFrameWidth, effectFrameHeight);
    pop();
  }

  // --- 繪製三秒回饋特效（煙火或閃電） ---
  updateAndDrawFeedbackEffect();

  // --- 當角色1接近角色2時，繪製上方半透明黃色數學測驗方框 ---
  if (isNearChar2 && currentQuiz) {
    drawQuizBox();
  }
}

// 隨機產生一題兩位數或個位數加法選擇題
function generateMathQuiz() {
  const numA = floor(random(5, 50));
  const numB = floor(random(5, 50));
  const correctAnswer = numA + numB;

  const optionSet = new Set([correctAnswer]);
  while (optionSet.size < 4) {
    const offset = random([-10, -5, -3, -2, -1, 1, 2, 3, 5, 10]);
    const wrongCandidate = correctAnswer + offset;
    if (wrongCandidate > 0) {
      optionSet.add(wrongCandidate);
    }
  }

  const options = shuffle(Array.from(optionSet));
  const answerIndex = options.indexOf(correctAnswer);

  return {
    question: `${numA} + ${numB} = ?`,
    options,
    answerIndex,
    selectedIndex: -1,
    isCorrect: null
  };
}

// 繪製畫布上方中央的數學選擇題方框與四個選項按鈕
function drawQuizBox() {
  const boxW = width / 3; // 寬為整個畫布寬的 1/3
  const boxH = height / 2; // 高為整個畫布高的 1/2
  const boxX = width / 2 - boxW / 2; // 方框中間對準畫布中間
  const boxY = 16; // 方框上方靠近畫布上方

  push();
  // 黃色方框，透明度為 90
  fill(255, 235, 59, 90);
  stroke(230, 180, 0, 200);
  strokeWeight(3);
  rectMode(CORNER);
  rect(boxX, boxY, boxW, boxH, 16);

  // 繪製題目標題與算式
  noStroke();
  fill(30, 30, 30);
  textAlign(CENTER, CENTER);

  const titleSize = constrain(boxH * 0.085, 14, 26);
  textSize(titleSize);
  textStyle(BOLD);
  text("數學加法挑戰", boxX + boxW / 2, boxY + boxH * 0.14);

  const questionSize = constrain(boxH * 0.15, 22, 44);
  textSize(questionSize);
  text(currentQuiz.question, boxX + boxW / 2, boxY + boxH * 0.32);

  // 繪製四個選項按鈕（2x2 網格排列）
  optionButtonBounds = [];
  const labels = ["A", "B", "C", "D"];
  const cols = 2;
  const rows = 2;
  const padX = boxW * 0.08;
  const gapX = boxW * 0.06;
  const gapY = boxH * 0.05;
  const gridTop = boxY + boxH * 0.46;
  const gridHeight = boxH * 0.42;
  const btnW = (boxW - padX * 2 - gapX) / cols;
  const btnH = (gridHeight - gapY) / rows;

  const btnTextSize = constrain(btnH * 0.42, 14, 26);
  textSize(btnTextSize);

  for (let i = 0; i < 4; i++) {
    const col = i % cols;
    const row = floor(i / cols);
    const bx = boxX + padX + col * (btnW + gapX);
    const by = gridTop + row * (btnH + gapY);

    optionButtonBounds.push({ x: bx, y: by, w: btnW, h: btnH, index: i });

    const isHovered =
      mouseX >= bx && mouseX <= bx + btnW &&
      mouseY >= by && mouseY <= by + btnH;

    // 決定按鈕底色（滑鼠懸停、已作答正確或錯誤）
    if (currentQuiz.selectedIndex === i) {
      fill(currentQuiz.isCorrect ? color(76, 175, 80, 235) : color(244, 67, 54, 235));
    } else if (currentQuiz.selectedIndex !== -1 && i === currentQuiz.answerIndex) {
      fill(76, 175, 80, 220);
    } else if (isHovered && currentQuiz.selectedIndex === -1) {
      fill(255, 255, 255, 250);
    } else {
      fill(255, 255, 255, 215);
    }

    stroke(80, 80, 80, 180);
    strokeWeight(2);
    rect(bx, by, btnW, btnH, 10);

    // 按鈕文字
    noStroke();
    fill(currentQuiz.selectedIndex === i ? 255 : 25);
    text(`${labels[i]}. ${currentQuiz.options[i]}`, bx + btnW / 2, by + btnH / 2);
  }

  // 若已作答，在底部顯示提示文字
  if (currentQuiz.selectedIndex !== -1) {
    textSize(constrain(boxH * 0.065, 12, 20));
    fill(currentQuiz.isCorrect ? color(20, 120, 40) : color(180, 20, 20));
    const resultMsg = currentQuiz.isCorrect ? "答對了！放煙火慶祝！" : "答錯了！小心閃電！";
    text(resultMsg, boxX + boxW / 2, boxY + boxH * 0.93);
  }

  pop();
}

// 觸發三秒煙火或三秒閃電特效
function triggerFeedbackEffect(type) {
  feedbackType = type;
  feedbackEndTime = millis() + 3000; // 持續 3 秒 (3000 毫秒)
  fireworksParticles = [];
  lastFireworkLaunch = 0;

  if (type === "fireworks") {
    spawnFireworkBurst(random(width * 0.2, width * 0.8), random(height * 0.15, height * 0.45));
    lastFireworkLaunch = millis();
  }
}

// 產生單次煙火爆炸粒子
function spawnFireworkBurst(cx, cy) {
  const palette = [
    color(255, 82, 82),
    color(255, 215, 64),
    color(105, 240, 174),
    color(64, 196, 255),
    color(224, 64, 251),
    color(255, 145, 0)
  ];
  const burstColor = random(palette);
  const particleCount = 65;

  for (let i = 0; i < particleCount; i++) {
    const angle = random(TWO_PI);
    const speed = random(2, 9);
    fireworksParticles.push({
      x: cx,
      y: cy,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed,
      alpha: 255,
      size: random(4, 8),
      col: burstColor
    });
  }
}

// 更新並繪製煙火與閃電特效
function updateAndDrawFeedbackEffect() {
  const now = millis();

  if (feedbackType === "fireworks") {
    if (now < feedbackEndTime) {
      // 每隔 0.45 秒在畫布隨機位置施放一發新煙火
      if (now - lastFireworkLaunch > 450) {
        spawnFireworkBurst(random(width * 0.15, width * 0.85), random(height * 0.12, height * 0.48));
        lastFireworkLaunch = now;
      }
    } else if (fireworksParticles.length === 0) {
      feedbackType = null;
      return;
    }

    push();
    noStroke();
    for (let i = fireworksParticles.length - 1; i >= 0; i--) {
      const p = fireworksParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12; // 重力下墜效果
      p.vx *= 0.98;
      p.alpha -= 4.5;

      if (p.alpha <= 0) {
        fireworksParticles.splice(i, 1);
        continue;
      }

      fill(red(p.col), green(p.col), blue(p.col), p.alpha);
      circle(p.x, p.y, p.size);
    }
    pop();
  } else if (feedbackType === "lightning") {
    if (now >= feedbackEndTime) {
      feedbackType = null;
      return;
    }

    push();
    // 螢幕偶發白紫閃光效果
    if (frameCount % 6 < 2) {
      noStroke();
      fill(230, 235, 255, random(40, 110));
      rectMode(CORNER);
      rect(0, 0, width, height);
    }

    // 繪製多道鋸齒狀閃電光束
    const boltCount = 2;
    for (let b = 0; b < boltCount; b++) {
      let lx = random(width * 0.15, width * 0.85);
      let ly = 0;
      const segments = 14;
      const stepY = height / segments;

      // 外層藍色電弧光暈
      stroke(120, 180, 255, 160);
      strokeWeight(10);
      noFill();
      beginShape();
      vertex(lx, ly);
      const points = [{ x: lx, y: ly }];
      for (let s = 1; s <= segments; s++) {
        lx += random(-45, 45);
        ly = s * stepY;
        vertex(lx, ly);
        points.push({ x: lx, y: ly });
      }
      endShape();

      // 內層高亮度白色閃電核心
      stroke(255, 255, 240, 245);
      strokeWeight(3.5);
      beginShape();
      for (const pt of points) {
        vertex(pt.x, pt.y);
      }
      endShape();
    }
    pop();
  }
}

// 處理滑鼠點擊選項按鈕作答
function mousePressed() {
  if (!wasNearChar2 || !currentQuiz || currentQuiz.selectedIndex !== -1) {
    return;
  }

  for (const btn of optionButtonBounds) {
    if (
      mouseX >= btn.x &&
      mouseX <= btn.x + btn.w &&
      mouseY >= btn.y &&
      mouseY <= btn.y + btn.h
    ) {
      currentQuiz.selectedIndex = btn.index;
      currentQuiz.isCorrect = btn.index === currentQuiz.answerIndex;

      if (currentQuiz.isCorrect) {
        triggerFeedbackEffect("fireworks"); // 答對觸發 3 秒煙火
      } else {
        triggerFeedbackEffect("lightning"); // 答錯觸發 3 秒閃電
      }
      break;
    }
  }
}

function keyPressed() {
  if (keyCode === RIGHT_ARROW) {
    isWalking = true;
    facingDirection = 1;
    return false;
  }
  if (keyCode === LEFT_ARROW) {
    isWalking = true;
    facingDirection = -1;
    return false;
  }
  if (keyCode === 32) {
    if (!spaceIsDown && !isCasting) {
      isCasting = true;
      magicStartFrame = frameCount;
      magicDirection = facingDirection;
    }
    spaceIsDown = true;
    return false;
  }
}

function keyReleased() {
  if (keyCode === 32) {
    spaceIsDown = false;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  characterX = constrain(characterX, 1, width - 1);
}