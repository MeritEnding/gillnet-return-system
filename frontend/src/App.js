// src/App.js
import { useEffect, useState, useRef } from 'react'; // ★ React Hook 추가
import { RouterProvider } from "react-router-dom";
import './App.css';
import router from './router';
import ScreenSaver from './temp/ScreenSaver'; // ★ 스크린세이버 컴포넌트 임포트

function App() {
  // 1. 스크린세이버 상태 관리
  const [isScreenSaverOn, setIsScreenSaverOn] = useState(false);
  const timerRef = useRef(null);

  // ★ 설정: 60초(60000ms) 동안 입력 없으면 절전 모드
  // const IDLE_TIMEOUT = 600000; 10분
  const IDLE_TIMEOUT = 600000; // 60초

  // 2. 타이머 초기화 함수 (사용자가 움직일 때마다 호출)
  const resetIdleTimer = () => {
    if (isScreenSaverOn) return; // 이미 켜져있으면 타이머 동작 안 함

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      // 시간이 다 되면 실행할 동작
      console.log("💤 절전 모드 진입");
      setIsScreenSaverOn(true);
      
      // ★ 보안 조치: 홈으로 이동 & 로그인 정보 삭제
      // App.js는 RouterProvider 밖이므로 router 객체를 직접 사용해야 합니다.
      router.navigate('/'); 
      sessionStorage.clear();
      localStorage.removeItem('user_token'); // 필요시 사용
    }, IDLE_TIMEOUT);
  };

  // 3. 깨우기 함수 (화면 터치 시)
  const wakeUp = () => {
    console.log("☀️ 기상!");
    setIsScreenSaverOn(false);
    resetIdleTimer(); // 타이머 재시작
  };

  // 4. 이벤트 리스너 등록 (터치, 클릭 감지)
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      if (!isScreenSaverOn) resetIdleTimer();
    };

    // 이벤트 등록
    events.forEach(event => window.addEventListener(event, handleActivity));
    
    // 최초 실행 시 타이머 시작
    resetIdleTimer();

    // 정리(Clean-up)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [isScreenSaverOn]);

  return (
    <div className="App">
      {/* 기존 라우터 렌더링 */}
      <RouterProvider router={router}/>

      {/* ★ 스크린세이버가 켜지면 화면 맨 위에 덮어씌움 */}
      {isScreenSaverOn && <ScreenSaver onWakeUp={wakeUp} />}
    </div>
  );
}

export default App;