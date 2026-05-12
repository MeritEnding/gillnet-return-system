// src/certificationPage/GearTypeSelectScreen.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '../mainPage/Header';
import BgImage from '../assets/bg_all.png';
import './GearTypeSelectScreen.css'; 

// ★ 실제 어구 이미지 import (경로 확인 필수)
import ImgHourglass from '../assets/스프링이 설치된 장구형의 통발.png';
import ImgConeCrab from '../assets/기존 어구.png';

const GearTypeSelectScreen = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isMember, setIsMember] = useState(false);

  const isTagalog = i18n.language.startsWith('tl') || i18n.language.startsWith('fil');

  // ★ [추가됨] 음성 재생을 위한 참조 변수들
  const voiceListCache = useRef([]);
  window.utterances = window.utterances || []; 
  const currentUtteranceRef = useRef(null);

  // =========================================================
  // ★ [추가됨] 완벽하게 다듬어진 TTS (음성 재생) 함수
  // =========================================================
  const getBestVoice = (langCode, voiceList) => {
    if (voiceList.length === 0) return null;
    let bestVoice = null;
    if (langCode.includes('ko')) bestVoice = voiceList.find(v => v.lang.includes('ko'));
    else if (langCode.includes('vi')) bestVoice = voiceList.find(v => v.lang.includes('vi'));
    else if (langCode.includes('id')) bestVoice = voiceList.find(v => v.lang.includes('id'));
    else if (langCode.includes('tl') || langCode.includes('fil')) bestVoice = voiceList.find(v => v.lang.includes('fil') || v.lang.includes('tl'));
    else if (langCode.includes('my')) bestVoice = voiceList.find(v => v.lang.includes('my'));
    else bestVoice = voiceList.find(v => v.lang.includes('en-US') || v.lang.includes('en'));
    return bestVoice;
  };

  const speak = (text, lang, voiceList) => {
    if (!('speechSynthesis' in window)) return;

    // 이전 안내방송이 남아있다면 즉시 끊어버림
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    window.utterances.push(utterance);
    currentUtteranceRef.current = utterance;

    const langMap = {
      'ko': 'ko-KR', 'en': 'en-US', 'vi': 'vi-VN',
      'tl': 'fil-PH', 'id': 'id-ID', 'my': 'my-MM'
    };
    
    const shortLang = lang.substring(0, 2);
    utterance.lang = langMap[shortLang] || 'en-US';
    
    const selectedVoice = getBestVoice(utterance.lang, voiceList);
    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.onend = () => {
      const index = window.utterances.indexOf(utterance);
      if (index > -1) window.utterances.splice(index, 1);
    };

    window.speechSynthesis.speak(utterance);

    // 크롬 버그 방어용 (긴 문장 멈춤 방지)
    const timer = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.resume();
      } else {
        clearInterval(timer);
      }
    }, 5000);
  };

  // =========================================================
  // ★ [추가됨] 화면이 켜질 때 나레이션 실행 & 꺼질 때 소리 중단
  // =========================================================
  useEffect(() => {
    // 음성 목록 불러오기
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) voiceListCache.current = voices;
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // 화면 진입 시 안내 멘트 재생 (0.5초 대기 후 부드럽게)
    const timer = setTimeout(() => {
      const text = t('gear_voice_guide'); // "반납하실 어구의 종류를 선택해주세요."
      speak(text, i18n.language, voiceListCache.current);
    }, 500);

    return () => {
      clearTimeout(timer);
      // 화면 밖으로 나가면 즉시 조용하게 만들기
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [t, i18n.language]);

  // =========================================================
  // 기존 로직
  // =========================================================
  useEffect(() => {
    const mbrNo = localStorage.getItem('mbr_no');
    if (mbrNo && mbrNo !== 'undefined' && mbrNo !== 'null' && mbrNo.trim() !== '') {
      setIsMember(true);
    } else {
      setIsMember(false);
    }
  }, []);

  const handleSelect = (gvbkType, clsfCd, clsfNm) => {
    localStorage.setItem('selected_gvbk_type', gvbkType); 
    localStorage.setItem('selected_fsgr_clsf_cd', clsfCd); 
    localStorage.setItem('selected_fsgr_clsf_nm', clsfNm); 

    navigate('/certificationPage/gear-scan');
  };

  return (
    <div className={`gear-wrapper ${isTagalog ? 'lang-tl' : ''}`} style={{ backgroundImage: `url(${BgImage})` }}>
      <Header />
      
      <div className="gear-content-area">
        <h2 className="gear-page-title">{t('gear_page_title') || '반환하실 어구를 터치해주세요'}</h2>
        <p className="gear-page-subtitle">{t('gear_page_subtitle') || '동일한 어구를 선택하고 반납해야 보증금이 환급됩니다.'}</p>
        
        <div className="gear-card massive-layout">
          
          {/* 1. 보증금어구 버튼 */}
          <button 
            className="gear-btn-massive deposit-massive" 
            onClick={() => handleSelect('1', 'FISGE', '장구형의통발')}
          >
            <div className="massive-badge deposit-badge">
              {t('gear_section_deposit') || '보증금어구 반환 (현금 환급)'}
            </div>
            
            <div className="gear-img-wrap-massive">
              <img src={ImgHourglass} alt="보증금 어구" className="gear-img-massive" />
            </div>
            
            <div className="gear-text-massive">
              {t('label_deposit_gear_short') || '보증금 어구'}
            </div>
          </button>

          {/* 2. 기존어구 버튼 (회원 전용) */}
          {isMember && (
            <button 
              className="gear-btn-massive existing-massive" 
              onClick={() => handleSelect('2', 'FISGE', '기존통발어구(바코드)')}
            >
              <div className="massive-badge existing-badge">
                {t('gear_section_existing') || '기존어구 반환 (포인트 적립)'}
              </div>
            
              <div className="gear-img-wrap-massive">
                <img src={ImgConeCrab} alt="기존 어구" className="gear-img-massive" />
              </div>

              <div className="gear-text-massive">
                {t('label_existing_gear_short') || '기존 어구'}
              </div>
            </button>
          )}

        </div>
      </div>
    </div>
  );
};

export default GearTypeSelectScreen;