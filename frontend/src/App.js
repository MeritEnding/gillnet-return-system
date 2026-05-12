// src/App.js
import React, { useEffect, useState, useRef } from 'react';
import { RouterProvider } from "react-router-dom";
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import './App.css';
import router from './router';
import ScreenSaver from './temp/ScreenSaver';

// ★ [추가] Footer 컴포넌트를 불러옵니다. (경로는 실제 위치에 맞게 수정해 주세요)
// 예: import Footer from './components/Footer'; 
import Footer from './mainPage/Footer'; 

function App() {
  const { t } = useTranslation();
  
  const [isScreenSaverOn, setIsScreenSaverOn] = useState(false);
  const timerRef = useRef(null);

  const [isServerError, setIsServerError] = useState(false);
  const [activeErrorKey, setActiveErrorKey] = useState(null); 

  const activeErrorRef = useRef(null);
  const lastSuccessTimeRef = useRef(Date.now());

  const IDLE_TIMEOUT = 600000;

  const resetIdleTimer = () => {
    if (isScreenSaverOn || isServerError) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      console.log("💤 절전 모드 진입");
      setIsScreenSaverOn(true);
      router.navigate('/');
      sessionStorage.clear();
      localStorage.removeItem('user_token');
    }, IDLE_TIMEOUT);
  };

  const wakeUp = () => {
    if (isServerError) return;
    console.log("☀️ 기상!");
    setIsScreenSaverOn(false);
    resetIdleTimer();
  };

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => { if (!isScreenSaverOn) resetIdleTimer(); };
    events.forEach(event => window.addEventListener(event, handleActivity));
    resetIdleTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [isScreenSaverOn, isServerError]);

  useEffect(() => {
    lastSuccessTimeRef.current = Date.now();

    const checkSystemHealth = async () => {
      try {
        const res = await axios.get('http://127.0.0.1:8080/api/system/hw/status', { timeout: 3000 });
        const plcData = res.data;

        lastSuccessTimeRef.current = Date.now();

        const PLC_ALARM_KEYS = ["88", "83", "85", "87", "97", "99", "104", "105"];

        let detectedErrorKey = null;
        for (const key of PLC_ALARM_KEYS) {
          if (plcData[key] === true) {
            detectedErrorKey = key;
            break;
          }
        }

        if (detectedErrorKey) {
          if (activeErrorRef.current !== detectedErrorKey) {
            activeErrorRef.current = detectedErrorKey;
            setIsScreenSaverOn(false);
            setIsServerError(true);
            setActiveErrorKey(detectedErrorKey);
            
            if (!window.location.pathname.includes('/admin/remote')) {
              router.navigate('/');
            }

            try {
              await axios.post('http://127.0.0.1:8080/api/system/error-report', {
                kioskId: 'BUSAN-001',
                location: '부산광역시 기장군 월전리 무인 반납 1호기',
                time: new Date().toLocaleString(),
                errorDetails: `[Hardware Error] ${t(`alarm_${detectedErrorKey}_title`)}`
              });
            } catch (e) { console.error("메일 발송 실패"); }
          }
        }
        else {
          if (isServerError) { 
            console.log("✅ 시스템 정상 복구 완료");
            activeErrorRef.current = null;
            setIsServerError(false);
            setActiveErrorKey(null);
          }
        }

      } catch (error) {
        if (error.response) {
          lastSuccessTimeRef.current = Date.now(); 
          return;
        }

        const elapsedSeconds = Math.floor((Date.now() - lastSuccessTimeRef.current) / 1000);
        
        if (elapsedSeconds >= 60 && !isServerError) {
          console.error("🚨 통신 단절 1분 경과! 에러 화면으로 전환합니다.");
          activeErrorRef.current = 'SW_ERROR';
          setIsScreenSaverOn(false);
          setIsServerError(true);
          setActiveErrorKey('SW_ERROR');
          
          if (!window.location.pathname.includes('/admin/remote')) {
            router.navigate('/');
          }
        }
      }
    };
    
    const sendHeartbeat = async () => {
      try {
        await axios.post('http://127.0.0.1:8080/api/system/heartbeat', {}, { timeout: 3000 });
      } catch (error) {
      }
    };

    const healthInterval = setInterval(checkSystemHealth, 3000);
    const heartbeatInterval = setInterval(sendHeartbeat, 10000); 
    
    return () => {
      clearInterval(healthInterval);
      clearInterval(heartbeatInterval);
    };
  }, [isServerError, t]);

  const isAdminRemote = window.location.pathname.includes('/admin/remote');

  return (
    <div className="App">
      <RouterProvider router={router} />

      {isScreenSaverOn && !isServerError && !isAdminRemote && <ScreenSaver onWakeUp={wakeUp} />}

      {isServerError && !isAdminRemote && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: '#1a1a1a', color: '#fff', zIndex: 999999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'sans-serif'
        }}>
          {/* 에러 아이콘 */}
          <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="#d9534f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '40px' }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>

          {/* 에러 제목 */}
          <h1 style={{ fontSize: '4.5rem', margin: '0 0 30px 0', color: '#d9534f', fontWeight: '900' }}>
            {t('system_maintenance_title')}
          </h1>

          {/* 에러 상세 설명 (실시간 번역) */}
          <div style={{ fontSize: '2.5rem', lineHeight: '1.6', textAlign: 'center', color: '#ddd', fontWeight: 'bold' }}>
            {activeErrorKey === 'SW_ERROR' ? (
              t('error_software_msg').split('\n').map((line, i) => (
                <React.Fragment key={i}>{line}<br /></React.Fragment>
              ))
            ) : activeErrorKey ? (
              <>
                <span style={{ fontSize: '2.8rem', color: '#f0ad4e' }}>{t(`alarm_${activeErrorKey}_title`)}</span>
                <br /><br />
                {t(`alarm_${activeErrorKey}_detail`).split('\n').map((line, i) => (
                  <React.Fragment key={i}>{line}<br /></React.Fragment>
                ))}
              </>
            ) : null}
          </div>

          <div style={{ marginTop: '60px', padding: '20px 40px', backgroundColor: '#333', borderRadius: '15px', border: '2px solid #555' }}>
            <span style={{ fontSize: '1.8rem', color: '#f0ad4e', fontWeight: 'bold' }}>
              {t('system_maintenance_wait')}
            </span>
          </div>

          {/* 관리자 수동 해제 버튼 (Footer에 가려지지 않도록 bottom 위치를 120px로 올림) */}
          <button
            onClick={() => {
              setIsServerError(false);
              setActiveErrorKey(null);
              lastSuccessTimeRef.current = Date.now();
            }}
            style={{
              position: 'absolute', bottom: '120px', padding: '10px 20px', fontSize: '1rem',
              backgroundColor: 'transparent', color: '#444', border: '1px solid #444',
              borderRadius: '5px', cursor: 'pointer', zIndex: 10
            }}
          >
            {t('system_maintenance_admin_unlock')}
          </button>

          {/* ★ [추가] 화면 최하단에 다국어 선택 Footer 배치 */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', zIndex: 10 }}>
            <Footer />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;