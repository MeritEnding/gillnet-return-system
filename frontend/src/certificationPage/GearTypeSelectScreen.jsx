// src/certificationPage/GearTypeSelectScreen.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // ★ 다국어 훅 추가
import Header from '../mainPage/Header';
import BgImage from '../assets/bg_all.png';
import './GearTypeSelectScreen.css';

// ★ 실제 어구 이미지 import
import ImgHourglass from '../assets/스프링이 설치된 장구형의 통발.png';
import ImgCylinder from '../assets/장어 통발.png';
import ImgGillNet from '../assets/자망어구.png';
import ImgConeSemi from '../assets/원뿔대형(반구형)의 통발.png';
import ImgConeCrab from '../assets/기존 어구.png';

// ★ 음성 안내(TTS) 헬퍼 함수 추가
const getBestVoice = (langCode, voiceList) => {
  if (!voiceList || voiceList.length === 0) return null;
  let bestVoice = null;
  if (langCode.includes('ko')) bestVoice = voiceList.find(v => v.lang.includes('ko'));
  else bestVoice = voiceList.find(v => v.lang.includes('en-US') || v.lang.includes('en'));
  return bestVoice;
};

const speak = (text, lang, voiceList) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  // 한국어가 아니면 기본적으로 영어 음성(en-US)을 사용하도록 매핑
  utterance.lang = lang.includes('ko') ? 'ko-KR' : 'en-US';
  const selectedVoice = getBestVoice(utterance.lang, voiceList);
  if (selectedVoice) utterance.voice = selectedVoice;
  window.speechSynthesis.speak(utterance);
};

const GearTypeSelectScreen = () => {
  const { t, i18n } = useTranslation(); 
  const navigate = useNavigate();
  const [isMember, setIsMember] = useState(false);
  
  // ★ 목소리 목록을 저장할 Ref
  const voiceListCache = useRef([]);

  useEffect(() => {
    const mbrNo = localStorage.getItem('mbr_no');
    if (mbrNo && mbrNo !== 'undefined' && mbrNo !== 'null' && mbrNo.trim() !== '') {
      setIsMember(true);
    } else {
      setIsMember(false);
    }
  }, []);

  // ★ 1. 디바이스의 목소리(Voice) 목록 불러오기
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) voiceListCache.current = voices;
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // ★ 2. 화면이 켜지면 음성 안내 시작
  useEffect(() => {
    // 다국어가 적용된 음성 메시지 가져오기
    const textToSpeak = t('gear_voice_guide') || '반납하실 어구를 선택해주세요.';
    
    // 화면 렌더링 후 약간의 딜레이(300ms)를 주고 자연스럽게 말하기 시작
    const speakTimer = setTimeout(() => {
      speak(textToSpeak, i18n.language, voiceListCache.current);
    }, 300);

    // 컴포넌트가 언마운트(화면이 꺼짐)될 때 타이머 정리 및 말하기 취소
    return () => {
      clearTimeout(speakTimer);
      window.speechSynthesis.cancel(); 
    };
  }, [t, i18n.language]);

  const handleSelect = (gvbkType, clsfCd, clsfNm) => {
    // ★ 다음 화면으로 넘어가기 전에 음성 즉시 끄기
    window.speechSynthesis.cancel();

    localStorage.setItem('selected_gvbk_type', gvbkType); 
    localStorage.setItem('selected_fsgr_clsf_cd', clsfCd); 
    localStorage.setItem('selected_fsgr_clsf_nm', clsfNm); 

    navigate('/certificationPage/gear-scan');
  };

  return (
    <div className="gear-wrapper" style={{ backgroundImage: `url(${BgImage})` }}>
      <Header />
      
      <div className="gear-content-area">
        
        <h2 className="gear-page-title">{t('gear_page_title') || '반환하실 어구를 터치해주세요'}</h2>
        <p className="gear-page-subtitle">{t('gear_page_subtitle') || '동일한 어구를 선택하고 반납을 해야 보증금이 환급됩니다.'}</p>
        
        <div className="gear-card">
          
          {/* 1. 보증금어구 섹션 */}
          <div className="gear-section">
            <h3 className="gear-section-title deposit">
             {t('gear_section_deposit') || '보증금어구 반환 (현금 환급)'}
            </h3>
            
            <div className="gear-grid">
              <button className="gear-btn deposit" onClick={() => handleSelect('1', 'FISGE', '장구형의통발')}>
                <img src={ImgHourglass} alt="장구형의 통발" className="gear-btn-img" />
                <div className="gear-btn-text">{t('gear_type_hourglass') || '장구형의 통발'}</div>
              </button>

              <button className="gear-btn deposit" onClick={() => handleSelect('1', 'EELTP', '장어통발')}>
                <img src={ImgCylinder} alt="장어통발" className="gear-btn-img" />
                <div className="gear-btn-text">{t('gear_type_eel') || '장어통발'}</div>
              </button>

              <button className="gear-btn deposit" onClick={() => handleSelect('1', 'GILNT', '자망(그물)')}>
                <img src={ImgGillNet} alt="자망 (그물)" className="gear-btn-img" />
                <div className="gear-btn-text">{t('gear_type_gill_net') || '자망 (그물)'}</div>
              </button>

              <button className="gear-btn deposit" onClick={() => handleSelect('1', 'FISGE', '원뿔대형(반구형)의 통발')}>
                <img src={ImgConeSemi} alt="원뿔대형 통발" className="gear-btn-img" />
                <div className="gear-btn-text">{t('gear_type_cone') || '원뿔대형 통발'}</div>
              </button>
            </div>
          </div>

          {/* 2. 기존어구 섹션 */}
          {isMember && (
            <div className="gear-section">
              <h3 className="gear-section-title existing">
                {t('gear_section_existing') || '기존어구 반환 (포인트 적립)'}
              </h3>
              <div className="gear-grid single">
                <button className="gear-btn existing" onClick={() => handleSelect('2', 'FISGE', '기존통발어구(바코드)')}>
                  <img src={ImgConeCrab} alt="기존 통발 어구" className="gear-btn-img" />
                  <div className="gear-btn-text">{t('gear_type_existing_trap') || '기존 통발 어구 (포인트)'}</div>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default GearTypeSelectScreen;