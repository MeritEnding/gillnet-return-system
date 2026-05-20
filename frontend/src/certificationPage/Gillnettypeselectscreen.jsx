// src/gillnetPage/GillnetTypeSelectScreen.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import Header from '../mainPage/Header';
import BgImage from '../assets/bg_all.png';
import './Gillnettypeselectscreen.css';

// 아이콘 및 이미지 import
import ImgGillnet from '../assets/자망어구.png'; 
import ImgGillnet1 from '../assets/기존자망어구.png'; 
import ImgDepositTag from '../assets/보증금 어구 태그.png'; 

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 19L8 12L15 5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GillnetTypeSelectScreen = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [gillnetMngNo, setGillnetMngNo] = useState(''); 

  const [gearList, setGearList] = useState([]); // [추가] 전체 목록 저장용

  const voiceListCache = useRef([]);

  const speak = useCallback((text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const langMap = { ko: 'ko-KR', en: 'en-US', vi: 'vi-VN', tl: 'fil-PH', id: 'id-ID', my: 'my-MM' };
    u.lang = langMap[i18n.language.substring(0, 2)] || 'ko-KR';
    const v = voiceListCache.current.find(x => x.lang.includes(u.lang.substring(0, 2)));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  }, [i18n.language]);

  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) voiceListCache.current = v;
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;

    const timer = setTimeout(() => {
      speak(t('gillnet_voice_guide') || '반납하실 자망 어구의 종류를 선택해 주세요.');
    }, 500);

    const fetchGearInfo = async () => {
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
        const res = await axios.get(`${API_URL}/api/v1/proxy/romg/fishing-gears`);
        
        // PDF v1.3 기준: fishing_gears 또는 list 확인
        const list = res.data?.data?.fishing_gears || res.data?.data?.list || [];
        console.log('📡 어구 종류 목록 수신:', list);
        setGearList(list);

        if (list.length > 0) {
          // '자망' 또는 분류코드 '01' 찾기 (데이터 타입에 유연하게 대응)
          const gillnet = list.find(g => {
            const code = String(g.bfr_fsgr_clsf_cd || '').padStart(2, '0');
            const name = g.bfr_fsgr_clsf_nm || '';
            return code === '01' || name.includes('자망');
          });

          if (gillnet) {
            console.log('✅ 자망 어구관리번호(bfr_fsgr_mng_no) 확인:', gillnet.bfr_fsgr_mng_no);
            setGillnetMngNo(gillnet.bfr_fsgr_mng_no);
          } else {
            console.warn('⚠️ 목록에서 자망(01)을 찾지 못했습니다. 첫 번째 항목을 사용해 봅니다.');
            setGillnetMngNo(list[0].bfr_fsgr_mng_no);
          }
        }
      } catch (error) { 
        console.error("어구 목록 조회 실패:", error);
      }
    };
    fetchGearInfo();

    return () => {
      clearTimeout(timer);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [t, speak]);

  const handleSelect = (gvbkType) => {
    // [보완] 클릭 시점에 다시 한번 ID 확인
    let finalMngNo = gillnetMngNo;
    if (!finalMngNo && gearList.length > 0) {
      const gnt = gearList.find(g => String(g.bfr_fsgr_clsf_cd || '').includes('1') || (g.bfr_fsgr_clsf_nm || '').includes('자망'));
      finalMngNo = gnt ? gnt.bfr_fsgr_mng_no : gearList[0].bfr_fsgr_mng_no;
    }

    localStorage.setItem('selected_gvbk_type', gvbkType);
    localStorage.setItem('selected_fsgr_clsf_cd', 'GILNT'); 
    localStorage.setItem('selected_fsgr_clsf_nm', '자망');
    localStorage.setItem('selected_bfr_fsgr_clsf_cd', '01'); 
    
    if (gvbkType === '2') {
      console.log('💾 기존자망 선택 - 어구관리번호 저장:', finalMngNo);
      localStorage.setItem('selected_bfr_fsgr_mng_no', finalMngNo || '');
    }
    navigate('/gillnet/sack-select');
  };

  return (
    <div className="gillnet-type-wrapper" style={{ backgroundImage: `url(${BgImage})` }}>
      <Header />
      <button className="auth-back-btn" onClick={() => navigate('/auth')}>
        <BackIcon /><span className="auth-back-text">{t('btn_back') || '뒤로가기'}</span>
      </button>

      <div className="gillnet-type-content-area">
        <h2 className="gillnet-page-title">{t('gillnet_type_title') || '반환하실 자망 어구를 터치해 주세요'}</h2>
        <p className="gillnet-page-subtitle">{t('gillnet_type_subtitle') || '구입증(흰색 구입증 바코드) 보유 여부에 따라 선택하세요.'}</p>

        <div className="gillnet-main-card gillnet-massive-layout">
          <button className="gillnet-btn-massive deposit-massive" onClick={() => handleSelect('1')}>
            <div className="gillnet-massive-badge deposit-badge">{t('gillnet_type_deposit_label') || '보증금 자망'}</div>
            <div className="gillnet-img-wrap-massive">
              <img src={ImgGillnet} alt="보증금 자망" className="gillnet-img-massive" />
              <img src={ImgDepositTag} alt="태그" className="gillnet-tag-img" />
            </div>
            <div className="gillnet-text-massive">
              {t('gillnet_type_deposit') || '보증금 자망 반환 (현금 환급)'}
              <div className="gillnet-type-desc">
                {t('gillnet_type_deposit_desc')?.split('\n').map((l, i) => <React.Fragment key={i}>{l}<br/></React.Fragment>) || '구입증(DMC 바코드) 보유 시 선택해 주세요.'}
              </div>
            </div>
          </button>

          <button className="gillnet-btn-massive existing-massive" onClick={() => handleSelect('2')}>
            <div className="gillnet-massive-badge existing-badge">{t('gillnet_type_existing_label') || '기존 자망'}</div>
            <div className="gillnet-img-wrap-massive">
              <img src={ImgGillnet1} alt="기존 자망" className="gillnet-img-massive" />
            </div>
            <div className="gillnet-text-massive">
              {t('gillnet_type_existing') || '기존 자망 반환 (포인트 적립)'}
              <div className="gillnet-type-desc">
                {t('gillnet_type_existing_desc')?.split('\n').map((l, i) => <React.Fragment key={i}>{l}<br/></React.Fragment>) || '구입증 없이 마대 규격만으로 자동 산정됩니다.'}
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GillnetTypeSelectScreen;