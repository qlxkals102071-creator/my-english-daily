// ============================================================
// [설정] 본인의 구글 시트 링크
// ============================================================
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRSpGfIs01pu73z_aKvjqdAH0m3UpctkMONg-1HzigUHk-R-nK6wVxewKy35cSg6fIFcRc9S80-V1NY/pub?gid=0&single=true&output=csv"; 
// ============================================================

let fullData = [];
let quizData = [];
let currentIndex = 0;
let score = 0;
let wrongAnswers = [];

let selectedMode = '';     
let quizDirection = 'eng-to-kor'; 

const startScreen = document.getElementById('start-screen');
const directionScreen = document.getElementById('direction-screen');
const loadingScreen = document.getElementById('loading-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const wrongNoteScreen = document.getElementById('wrong-note-screen');
const listScreen = document.getElementById('list-screen');

const btnHome = document.getElementById('btn-home');
const btnFinish = document.getElementById('btn-finish');

// ============================================================
// [핵심 변경] 사이트 접속 시 자동으로 데이터 가져오기
// ============================================================
window.addEventListener('DOMContentLoaded', async () => {
    // 1. 링크 확인
    if(GOOGLE_SHEET_CSV_URL.includes("여기에_복사한")) {
        alert("HTML 파일 코드를 수정해서 구글 시트 링크를 넣어주세요!");
        return;
    }

    // 2. 데이터 가져오기 시작
    try {
        const response = await fetch(GOOGLE_SHEET_CSV_URL);
        const dataText = await response.text();
        fullData = parseCSV(dataText);

        if (fullData.length === 0) {
            alert("데이터가 없습니다. 구글 시트를 확인해주세요.");
            return;
        }

        // 3. 로딩 화면 숨기고, 시작 화면(메뉴) 보여주기
        loadingScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
        
    } catch (error) {
        console.error(error);
        alert("데이터를 가져오는데 실패했습니다. 인터넷 연결이나 링크를 확인해주세요.");
        // 실패해도 일단 로딩화면은 숨기지 않음 (새로고침 유도)
    }
});

// ============================================================

// 1단계: 모드 선택 (이미 데이터는 로딩되어 있음!)
function selectMode(mode) {
    selectedMode = mode;
    startScreen.classList.add('hidden');
    directionScreen.classList.remove('hidden'); 
}

// [전체 리스트 보기] - 로딩 과정 없이 바로 보여줌
function viewAllList() {
    startScreen.classList.add('hidden');
    listScreen.classList.remove('hidden');
    
    const listUl = document.getElementById('full-list');
    listUl.innerHTML = ""; 

    // 최신순으로 보여주기 (역순 정렬) - 원하면 .reverse() 제거
    const displayData = [...fullData].reverse();

    displayData.forEach((item, index) => {
        // 원래 데이터에서의 인덱스 계산 (역순이라 계산 필요)
        const originalIndex = fullData.length - index;
        
        const li = document.createElement('li');
        li.innerHTML = `
            <div style="font-size:0.8rem; color:#999; margin-bottom:5px;">No.${originalIndex}</div>
            <div style="font-weight:bold; color:#1565c0; font-size:1.1rem;">${item.eng}</div>
            <div style="font-size:0.9rem; color:#666;">${item.lit ? '(직역) '+item.lit : ''}</div>
            <div style="font-weight:bold; color:#e65100; margin-top:5px;">➥ ${item.trans}</div>
        `;
        listUl.appendChild(li);
    });
}

// 2단계: 퀴즈 시작 (로딩 과정 없이 바로 시작)
function startQuiz(direction) {
    quizDirection = direction;
    
    directionScreen.classList.add('hidden');
    // 로딩 스크린 호출 제거 -> 바로 퀴즈 세팅
    
    setupQuizData(selectedMode); 

    quizScreen.classList.remove('hidden');
    btnHome.classList.remove('hidden'); 
    btnFinish.classList.remove('hidden'); 
    
    currentIndex = 0;
    score = 0;
    wrongAnswers = [];
    loadQuestion();
}

// 홈으로 가기 (새로고침 대신 화면 전환만)
function goHome() {
    // 퀴즈 도중이라면 확인
    if(!quizScreen.classList.contains('hidden') || !resultScreen.classList.contains('hidden')) {
        if(!confirm("처음 메뉴로 돌아갈까요?")) return;
    }
    
    // 모든 화면 숨기고 시작 화면만 켜기
    quizScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    wrongNoteScreen.classList.add('hidden');
    listScreen.classList.add('hidden');
    directionScreen.classList.add('hidden');
    
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

function parseCSV(text) {
    const lines = text.trim().split('\n');
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVRow(lines[i]);
        if (row.length >= 3) {
            result.push({
                eng: row[0].replace(/^"|"$/g, '').trim(),
                lit: row[1].replace(/^"|"$/g, '').trim(),
                trans: row[2].replace(/^"|"$/g, '').trim()
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

function setupQuizData(mode) {
    if (mode === 'recent') {
        quizData = fullData.slice(-10); 
    } else if (mode === 'random') {
        const shuffled = [...fullData].sort(() => 0.5 - Math.random());
        quizData = shuffled.slice(0, 10);
    } else {
        quizData = fullData; // 전체 다 풀기
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
    document.getElementById('progress-text').innerText = `문제 ${currentIndex + 1} / ${quizData.length}`;

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
    if (isCorrect) score++;
    else wrongAnswers.push(quizData[currentIndex]);
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
    if (totalSolved > 0) {
        finalScore = Math.round((score / totalSolved) * 100);
    }

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