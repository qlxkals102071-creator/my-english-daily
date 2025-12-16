// ============================================================
// [설정] 본인의 구글 시트 링크
// ============================================================
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRSpGfIs01pu73z_aKvjqdAH0m3UpctkMONg-1HzigUHk-R-nK6wVxewKy35cSg6fIFcRc9S80-V1NY/pub?gid=0&single=true&output=csv"; 
// ============================================================
const STORAGE_KEY = 'my_vocab_weakness_v1';

let fullData = [];
let quizData = [];
let currentIndex = 0;
let score = 0;
let wrongAnswers = [];

let selectedMode = '';      
let selectedCategory = '';  
let quizDirection = 'eng-to-kor'; 

const startScreen = document.getElementById('start-screen');
const categoryScreen = document.getElementById('category-screen'); 
const directionScreen = document.getElementById('direction-screen');
const loadingScreen = document.getElementById('loading-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const wrongNoteScreen = document.getElementById('wrong-note-screen');
const listScreen = document.getElementById('list-screen');
const weaknessScreen = document.getElementById('weakness-screen');

const btnHome = document.getElementById('btn-home');
const btnFinish = document.getElementById('btn-finish');

// [초기화]
window.addEventListener('DOMContentLoaded', async () => {
    if(GOOGLE_SHEET_CSV_URL.includes("여기에_복사한")) {
        alert("HTML 파일 코드를 수정해서 구글 시트 링크를 넣어주세요!");
        return;
    }
    try {
        const response = await fetch(GOOGLE_SHEET_CSV_URL);
        const dataText = await response.text();
        fullData = parseCSV(dataText);

        if (fullData.length === 0) {
            alert("데이터가 없습니다.");
            return;
        }
        loadingScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
    } catch (error) {
        console.error(error);
        alert("데이터 로딩 실패. 새로고침 해주세요.");
    }
});

// 1. 모드 선택 함수 (수정됨)
// 'recent' 모드일 때는 카테고리 선택 화면을 건너뛰고 바로 '전체' 주제로 설정해버려!
function selectMode(mode) {
    selectedMode = mode;
    startScreen.classList.add('hidden');

    // [변경] '최신 10개' 모드면 -> 카테고리 선택 건너뛰고 바로 방향 선택으로 직행!
    if (mode === 'recent') {
        // 강제로 '전체(all)' 카테고리를 선택한 것처럼 처리해서 함수 호출
        selectCategory('all'); 
    } else {
        // '랜덤' 모드 등 다른 건 기존처럼 카테고리 선택 화면 보여주기
        prepareCategoryButtons();
        categoryScreen.classList.remove('hidden');
    }
}
// 카테고리 버튼 생성
function prepareCategoryButtons() {
    const catListDiv = document.getElementById('category-list');
    catListDiv.innerHTML = ""; 

    const allBtn = document.createElement('button');
    allBtn.className = "btn-mode mode-blue";
    allBtn.innerHTML = `<strong>🌈 전체 주제 섞어서</strong><span>주제 상관없이 다 공부할래요</span>`;
    allBtn.onclick = () => selectCategory('all');
    catListDiv.appendChild(allBtn);

    const categories = [...new Set(fullData.map(item => item.category).filter(c => c))];

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = "btn-mode mode-blue"; 
        btn.innerHTML = `<strong>${cat}</strong><span>집중 공략하기</span>`;
        btn.onclick = () => selectCategory(cat);
        catListDiv.appendChild(btn);
    });
}

// 2. 카테고리 선택 -> 방향 선택
function selectCategory(category) {
    selectedCategory = category;
    categoryScreen.classList.add('hidden');
    directionScreen.classList.remove('hidden');
}

// 2. 뒤로 가기 함수 (수정됨)
// 방향 선택 화면에서 '뒤로 가기' 눌렀을 때, '최신 모드'였으면 홈으로 가야 해!
function backToCategory() {
    directionScreen.classList.add('hidden');

    // [변경] 최신 모드(recent)는 카테고리 화면을 안 거쳤으니까, 바로 홈으로 보내기
    if (selectedMode === 'recent') {
        startScreen.classList.remove('hidden');
    } else {
        // 다른 모드는 원래대로 카테고리 선택 화면으로 이동
        categoryScreen.classList.remove('hidden');
    }
}

// 3. 퀴즈 시작
function startQuiz(direction) {
    quizDirection = direction;
    directionScreen.classList.add('hidden');
    
    if (selectedMode === 'weakness_quiz') {
        // startWeaknessQuiz에서 이미 설정됨
    } else {
        setupQuizData(selectedMode, selectedCategory);
    }

    if (quizData.length === 0) {
        alert("선택한 조건에 맞는 단어가 부족해요!");
        goHome();
        return;
    }

    quizScreen.classList.remove('hidden');
    btnHome.classList.remove('hidden'); 
    btnFinish.classList.remove('hidden'); 
    
    currentIndex = 0;
    score = 0;
    wrongAnswers = []; 
    loadQuestion();
}

// 데이터 세팅 (필터링 -> 슬라이싱)
function setupQuizData(mode, category) {
    let targetData = fullData;
    if (category !== 'all') {
        targetData = fullData.filter(item => item.category === category);
    }

    if (mode === 'recent') {
        quizData = targetData.slice(-10); 
    } else if (mode === 'random') {
        const shuffled = [...targetData].sort(() => 0.5 - Math.random());
        quizData = shuffled.slice(0, 10);
    } else {
        quizData = targetData; 
    }
}

function loadQuestion() {
    if (currentIndex >= quizData.length) {
        showResult();
        return;
    }
    
    document.getElementById('btn-show-answer').classList.remove('hidden');
    document.getElementById('answer-area').classList.add('hidden');
    
    const item = quizData[currentIndex];
    
    const catTag = document.getElementById('quiz-category-tag');
    catTag.innerText = item.category ? `[${item.category}]` : "[주제 없음]";

    if (selectedMode === 'weakness_quiz') {
        document.getElementById('progress-text').innerText = `약점 복습 ${currentIndex + 1} / ${quizData.length}`;
    } else {
        document.getElementById('progress-text').innerText = `문제 ${currentIndex + 1} / ${quizData.length}`;
    }

    if (quizDirection === 'eng-to-kor') {
        document.getElementById('q-main').innerText = item.eng;
        document.getElementById('q-sub').innerText = item.lit ? `(직역) ${item.lit}` : "";
        document.getElementById('a-main').innerText = item.trans;
        document.getElementById('a-sub').innerText = ""; 
    } else {
        document.getElementById('q-main').innerText = item.trans;
        document.getElementById('q-sub').innerText = ""; 
        document.getElementById('a-main').innerText = item.eng;
        document.getElementById('a-sub').innerText = item.lit ? `(직역) ${item.lit}` : "";
    }
}

function showAnswer() {
    document.getElementById('btn-show-answer').classList.add('hidden');
    document.getElementById('answer-area').classList.remove('hidden');
}

function submitResult(isCorrect) {
    if (isCorrect) {
        score++;
    } else {
        const item = quizData[currentIndex];
        wrongAnswers.push(item);
        
        const storedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (storedData[item.eng]) storedData[item.eng]++;
        else storedData[item.eng] = 1;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storedData));
    }
    currentIndex++;
    loadQuestion();
}

function showResult() {
    quizScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    btnHome.classList.add('hidden');
    btnFinish.classList.add('hidden');

    const totalSolved = currentIndex;
    let finalScore = 0;
    if (totalSolved > 0) finalScore = Math.round((score / totalSolved) * 100);

    document.getElementById('score-text').innerText = `${finalScore}점`;
    document.getElementById('sub-score-text').innerText = `(총 ${totalSolved}문제 중 ${score}개 정답)`;

    const feedbackElem = document.getElementById('feedback-text');
    if (finalScore === 100) {
        feedbackElem.innerText = "완벽해요! 모든 문제를 맞췄습니다! 🎉";
        feedbackElem.style.color = "#4CAF50";
    } else if (finalScore >= 80) {
        feedbackElem.innerText = "훌륭해요! 조금만 더 하면 만점!";
        feedbackElem.style.color = "#2196F3";
    } else {
        feedbackElem.innerText = "오답 노트를 확인하고 다시 도전해보세요!";
        feedbackElem.style.color = "#f44336";
    }
}

function openWeaknessManager() {
    startScreen.classList.add('hidden');
    weaknessScreen.classList.remove('hidden');
    renderWeaknessList();
}

function renderWeaknessList() {
    const listUl = document.getElementById('weakness-list');
    listUl.innerHTML = "";
    
    const storedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    let sortedItems = Object.entries(storedData).sort((a, b) => b[1] - a[1]);
    
    if (sortedItems.length > 20) sortedItems = sortedItems.slice(0, 20);
    
    if (sortedItems.length === 0) {
        listUl.innerHTML = "<li style='text-align:center; color:#999;'>아직 틀린 단어가 없어요! 완벽하시네요! 콩!</li>";
        document.getElementById('btn-start-weakness').classList.add('hidden');
        return;
    }
    
    document.getElementById('btn-start-weakness').classList.remove('hidden');

    sortedItems.forEach((item) => {
        const engWord = item[0];
        const count = item[1];
        const originalItem = fullData.find(d => d.eng === engWord);
        const trans = originalItem ? originalItem.trans : "(데이터 없음)";
        
        const categoryBadge = originalItem && originalItem.category 
            ? `<span style="font-size:0.7rem; background:#eee; padding:2px 6px; border-radius:4px; color:#555; margin-left:5px;">${originalItem.category}</span>` 
            : "";

        const li = document.createElement('li');
        li.innerHTML = `
            <div style="font-size:0.8rem; color:#e53935; font-weight:bold;">🚨 틀린 횟수: ${count}회 ${categoryBadge}</div>
            <div style="font-weight:bold; color:#1565c0; font-size:1.1rem; margin-top:5px;">${engWord}</div>
            <div style="font-weight:bold; color:#e65100; margin-top:5px;">➥ ${trans}</div>
            <button class="btn-delete" onclick="deleteWeakness('${engWord.replace(/'/g, "\\'")}')">X</button>
        `;
        listUl.appendChild(li);
    });
}

function deleteWeakness(word) {
    if(!confirm(`'${word}' 단어를 약점 리스트에서 삭제할까요?`)) return;
    const storedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    delete storedData[word]; 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedData)); 
    renderWeaknessList(); 
}

function resetWeaknessData() {
    if(!confirm("정말 모든 오답 기록을 삭제하시겠습니까?")) return;
    localStorage.removeItem(STORAGE_KEY);
    renderWeaknessList();
    alert("오답 기록이 초기화되었습니다. 새 마음으로 시작해요! 콩!");
}

function startWeaknessQuiz() {
    const storedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    let sortedKeys = Object.entries(storedData).sort((a, b) => b[1] - a[1]).map(i => i[0]);
    if (sortedKeys.length > 20) sortedKeys = sortedKeys.slice(0, 20); 

    quizData = fullData.filter(item => sortedKeys.includes(item.eng));
    quizData.sort((a, b) => sortedKeys.indexOf(a.eng) - sortedKeys.indexOf(b.eng));

    if(quizData.length === 0) return alert("퀴즈를 낼 단어가 없어요.");

    selectedMode = 'weakness_quiz';
    startQuiz('eng-to-kor'); 
}

function parseCSV(text) {
    const lines = text.trim().split('\n');
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVRow(lines[i]);
        if (row.length >= 3) {
            result.push({
                eng: row[0].replace(/^"|"$/g, '').trim(),
                lit: row[1].replace(/^"|"$/g, '').trim(),
                trans: row[2].replace(/^"|"$/g, '').trim(),
                category: row[3] ? row[3].replace(/^"|"$/g, '').trim() : ""
            });
        }
    }
    return result;
}

function parseCSVRow(row) {
    let inQuote = false;
    let currentToken = "";
    const result = [];
    for(let i=0; i<row.length; i++) {
        const char = row[i];
        if(char === '"') { inQuote = !inQuote; continue; }
        if(char === ',' && !inQuote) {
            result.push(currentToken);
            currentToken = "";
        } else {
            currentToken += char;
        }
    }
    result.push(currentToken);
    return result;
}

// [수정된 부분] 전체 리스트 1번부터 표시
function viewAllList() {
    startScreen.classList.add('hidden');
    listScreen.classList.remove('hidden');
    
    const listUl = document.getElementById('full-list');
    listUl.innerHTML = ""; 
    
    // 이전에는 .reverse() 했지만, 이제는 그대로 사용 (fullData 순서대로 = 1번부터)
    fullData.forEach((item, index) => {
        // 인덱스도 1부터 차례대로
        const currentIndex = index + 1;
        const catBadge = item.category ? `<span style="background:#eee; padding:2px 6px; border-radius:4px; font-size:0.7rem; color:#666; margin-left:5px;">${item.category}</span>` : "";
        
        const li = document.createElement('li');
        li.innerHTML = `
            <div style="font-size:0.8rem; color:#999; margin-bottom:5px;">No.${currentIndex} ${catBadge}</div>
            <div style="font-weight:bold; color:#1565c0; font-size:1.1rem;">${item.eng}</div>
            <div style="font-size:0.9rem; color:#666;">${item.lit ? '(직역) '+item.lit : ''}</div>
            <div style="font-weight:bold; color:#e65100; margin-top:5px;">➥ ${item.trans}</div>
        `;
        listUl.appendChild(li);
    });
}

function goHome() {
    if(!quizScreen.classList.contains('hidden') || !resultScreen.classList.contains('hidden')) {
        if(!confirm("처음 메뉴로 돌아갈까요?")) return;
    }
    
    quizScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    wrongNoteScreen.classList.add('hidden');
    listScreen.classList.add('hidden');
    categoryScreen.classList.add('hidden'); 
    directionScreen.classList.add('hidden');
    weaknessScreen.classList.add('hidden');
    
    btnHome.classList.add('hidden');
    btnFinish.classList.add('hidden');

    startScreen.classList.remove('hidden');
}

function finishQuizEarly() {
    if(currentIndex === 0) {
        alert("아직 푼 문제가 없습니다!");
        return;
    }
    if(!confirm("지금까지 푼 문제로 채점하고 종료할까요?")) return;
    showResult();
}

function showWrongNote() {
    if (wrongAnswers.length === 0) return alert("틀린 문제가 없습니다!");
    resultScreen.classList.add('hidden');
    wrongNoteScreen.classList.remove('hidden');
    const list = document.getElementById('wrong-list');
    list.innerHTML = "";
    
    wrongAnswers.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<div style="font-weight:bold; color:#1565c0;">${item.eng}</div><div style="font-size:0.9rem; color:#666;">${item.lit}</div><div style="font-weight:bold; color:#e65100;">➥ ${item.trans}</div>`;
        list.appendChild(li);
    });
}

function closeWrongNote() {
    wrongNoteScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
}