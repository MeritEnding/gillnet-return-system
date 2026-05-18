// src/mainPage/modals/AccountInputModal.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as Hangul from 'hangul-js';
import { useTranslation } from 'react-i18next'; // ★ 다국어 훅 추가
import './AccountInputModal.css';

const AccountInputModal = ({ onClose }) => {
  const { t } = useTranslation(); // ★ 번역 함수 선언
  const navigate = useNavigate();
  const [banks, setBanks] = useState([]);
  const [bankCd, setBankCd] = useState('');
  const [actno, setActno] = useState('');
  const [acctNm, setAcctNm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 키패드 상태 ('bank', 'text', 'number', '')
  const [showKeypad, setShowKeypad] = useState('');
  // 한글 조합 배열 상태
  const [acctNmJamo, setAcctNmJamo] = useState([]);

  // 커스텀 알림창 상태
  const [kioskAlert, setKioskAlert] = useState({
    show: false,
    message: '',
    type: 'success', // 'success' 또는 'error'
    onConfirm: null
  });


  // 컴포넌트 상단에 추가
  const maskName = (name) => {
    if (!name || typeof name !== 'string' || name.length < 2) return name || 'Guest';
    if (name.length === 2) return name.substring(0, 1) + '*';
    return name.substring(0, 1) + '*'.repeat(name.length - 2) + name.substring(name.length - 1);
  };

  const maskAccountNumber = (account) => {
    if (!account || typeof account !== 'string' || account.length < 6) return account;
    const start = account.substring(0, 4);
    const end = account.substring(account.length - 3);
    const masked = '*'.repeat(account.length - 7);
    return `${start}${masked}${end}`;
  };

  useEffect(() => {
    // 1. 로컬스토리지에서 로그인 시 저장된 '최신' 정보를 즉시 가져옵니다.
    const savedBankCd = localStorage.getItem('bank_cd');
    const savedActno = localStorage.getItem('actno');
    const savedAcctNm = localStorage.getItem('acct_nm') || localStorage.getItem('fisherman_name');

    // 값이 존재할 때만 상태 업데이트
    if (savedBankCd) setBankCd(savedBankCd);
    if (savedActno) setActno(savedActno);
    if (savedAcctNm) setAcctNm(savedAcctNm);

    // 2. 은행 목록 불러오기
    const fetchBanks = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/v1/proxy/banks`);
        if (res.data?.data?.banks) {
          setBanks(res.data.data.banks);
        }
      } catch (err) {
        console.error('은행 목록 로드 실패', err);
      }
    };
    fetchBanks();
  }, [onClose]);

  // --- 한글 키패드 로직 ---
  const openTextKeypad = () => {
    setAcctNmJamo(Hangul.disassemble(acctNm || ''));
    setShowKeypad('text');
  };

  const handleHangulClick = (char) => {
    let newJamo = [...acctNmJamo];
    // ★ 번역된 텍스트와 원본 텍스트 모두 대응 가능하도록 수정
    if (char === t('account_keypad_delete') || char === '지우기') {
      newJamo.pop();
    } else if (char === t('account_keypad_clear') || char === '초기화') {
      newJamo = [];
    } else {
      newJamo.push(char);
    }
    setAcctNmJamo(newJamo);
    setAcctNm(Hangul.assemble(newJamo));
  };

  // --- 숫자 키패드 로직 ---
  const handleKeypadClick = (val) => {
    if (val === 'DEL' || val === t('account_keypad_delete') || val === '지우기') {
      setActno((prev) => prev.slice(0, -1));
    } else if (val === 'CLEAR' || val === t('account_keypad_clear') || val === '초기화') {
      setActno('');
    } else {
      setActno((prev) => prev + val);
    }
  };

  // --- 계좌 인증 처리 ---
  const handleVerifyAccount = async () => {
    if (!bankCd || !actno || !acctNm) {
      setKioskAlert({
        show: true,
        message: t('account_alert_empty') || '은행, 예금주명, 계좌번호를\n모두 입력해주세요.',
        type: 'error',
        onConfirm: () => setKioskAlert({ show: false, message: '', type: 'success', onConfirm: null })
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/v1/proxy/account/verify`, {
        bank_cd: bankCd,
        actno: actno.replace(/-/g, ''),
        acct_nm: acctNm
      });

      if (res.data?.status === "200" || res.data?.data?.success) {
        localStorage.setItem('bank_cd', res.data.data.bank_cd || bankCd);
        localStorage.setItem('actno', res.data.data.actno || actno);
        localStorage.setItem('acct_nm', res.data.data.acct_nm || acctNm);

        // 성공 알림 띄우기
        setKioskAlert({
          show: true,
          message: t('account_alert_success') || '계좌 정보가\n성공적으로 확인되었습니다.\n잠시 후 다음 화면으로 이동합니다.',
          type: 'success',
          onConfirm: null
        });

        // 2.5초 뒤 자동 이동
        setTimeout(() => {
          setKioskAlert({ show: false, message: '', type: 'success', onConfirm: null });
          onClose();
          navigate('/gillnet/type-select');
        }, 2500);

      } else {
        setKioskAlert({
          show: true,
          message: t('account_alert_fail') || '계좌 인증에 실패했습니다.\n정보를 다시 확인해주세요.',
          type: 'error',
          onConfirm: () => setKioskAlert({ show: false, message: '', type: 'error', onConfirm: null })
        });
      }
    } catch (err) {
      setKioskAlert({
        show: true,
        message: t('account_alert_error') || '서버 통신 오류로\n계좌 인증에 실패했습니다.',
        type: 'error',
        onConfirm: () => setKioskAlert({ show: false, message: '', type: 'error', onConfirm: null })
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="account-backdrop" onClick={onClose}>
      <div className="account-modal-content" onClick={(e) => e.stopPropagation()}>

        <div className="account-header">
          <h2 className="account-title">{t('account_title') || '환급받을 계좌를 확인해 주세요'}</h2>
          <p className="account-subtitle">{t('account_subtitle') || '(항목을 터치하여 수정할 수 있습니다)'}</p>
        </div>

        {/* 1. 은행 선택 영역 */}
        <div className="account-form-group">
          <label className="account-label">{t('account_bank_label') || '은행 (필수)'}</label>
          <div
            className={`account-input-box ${showKeypad === 'bank' ? 'highlight' : ''}`}
            onClick={() => setShowKeypad('bank')}
          >
            {bankCd ? banks.find(b => b.bank_cd === bankCd)?.bank_nm || t('account_bank_selected') : t('account_bank_placeholder')}
          </div>

          {showKeypad === 'bank' && (
            <div className="bank-grid-container">
              {banks.map(b => (
                <button
                  key={b.bank_cd}
                  className="bank-btn"
                  onClick={() => { setBankCd(b.bank_cd); setShowKeypad(''); }}
                >
                  {b.bank_nm}
                </button>
              ))}
              <button className="bank-btn" onClick={() => setShowKeypad('')} style={{ background: '#555', color: '#fff' }}>
                {t('account_bank_close') || '닫기'}
              </button>
            </div>
          )}
        </div>

        {/* 2. 예금주명 입력 영역 (한글 가상 키보드) */}
        <div className="account-form-group">
          <label className="account-label">{t('account_name_label') || '예금주명 (필수)'}</label>
          <div
            className={`account-input-box ${showKeypad === 'text' ? 'highlight' : ''}`}
            onClick={openTextKeypad}
          >
            {/* ▼ 수정됨: 마스킹 로직 적용 */}
            {acctNm
              ? (showKeypad === 'text' ? acctNm : maskName(acctNm))
              : t('account_name_placeholder')}
          </div>

          {showKeypad === 'text' && (
            <div className="account-keypad-container">
              <div className="hangul-keypad-grid">
                {['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ',
                  'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
                  'ㅏ', 'ㅑ', 'ㅓ', 'ㅕ', 'ㅗ', 'ㅛ', 'ㅜ',
                  'ㅠ', 'ㅡ', 'ㅣ', 'ㅐ', 'ㅔ',
                  t('account_keypad_delete') || '지우기',
                  t('account_keypad_clear') || '초기화'].map((char) => (
                    <button
                      key={char}
                      className={`hangul-btn ${char.length > 1 ? 'hangul-action-btn' : ''}`}
                      onClick={() => handleHangulClick(char)}
                    >
                      {char}
                    </button>
                  ))}
              </div>
              <button className="account-keypad-close" onClick={() => setShowKeypad('')}>
                {t('account_keypad_close') || '키패드 닫기'}
              </button>
            </div>
          )}
        </div>

        {/* 3. 계좌번호 입력 영역 */}
        <div className="account-form-group">
          <label className="account-label">{t('account_number_label') || '계좌번호 (터치하여 수정)'}</label>
          <div
            className={`account-input-box ${showKeypad === 'number' ? 'highlight' : ''}`}
            onClick={() => setShowKeypad('number')}
          >
            {/* ▼ 수정됨: 마스킹 로직 적용 */}
            {actno 
              ? (showKeypad === 'number' ? actno : maskAccountNumber(actno)) 
              : t('account_number_placeholder')}
          </div>

          {showKeypad === 'number' && (
            <div className="account-keypad-container">
              <div className="account-keypad-grid">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, t('account_keypad_clear') || '초기화', 0, t('account_keypad_delete') || '지우기'].map((key) => (
                  <button
                    key={key}
                    className={`account-keypad-btn ${typeof key === 'string' ? 'hangul-action-btn' : ''}`}
                    onClick={() => handleKeypadClick(key)}
                  >
                    {key}
                  </button>
                ))}
              </div>
              <button className="account-keypad-close" onClick={() => setShowKeypad('')}>
                {t('account_keypad_close') || '키패드 닫기'}
              </button>
            </div>
          )}
        </div>

        {/* 하단 확인/취소 버튼 */}
        <div className="account-action-group">
          <button className="account-btn account-btn-confirm" onClick={handleVerifyAccount} disabled={isLoading}>
            {isLoading ? (t('account_btn_loading') || '확인 중...') : (t('account_btn_confirm') || '이 계좌로 진행')}
          </button>
          <button className="account-btn account-btn-cancel" onClick={onClose}>
            {t('account_btn_cancel') || '취소'}
          </button>
        </div>
      </div>

      {/* ★ 키오스크 전용 커스텀 알림창 */}
      {kioskAlert.show && (
        <div className="alert-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="alert-content">

            {/* 상단 헤더 */}
            <div style={{ backgroundColor: kioskAlert.type === 'success' ? '#009CDA' : '#FF4B4B', padding: '35px', textAlign: 'center' }}>
              <h2 style={{ color: 'white', margin: 0, fontSize: '4rem', fontWeight: '900' }}>
                {kioskAlert.type === 'success' ? (t('account_alert_title_success') || '인증 완료') : (t('account_alert_title_error') || '확인 필요')}
              </h2>
            </div>

            {/* 본문 내용 */}
            <div style={{ padding: '70px 40px' }}>
              <p style={{ fontSize: '3.4rem', marginBottom: kioskAlert.type === 'error' ? '50px' : '0', lineHeight: '1.6', textAlign: 'center', color: '#333', fontWeight: '800', wordBreak: 'keep-all' }}>
                {kioskAlert.message.split('\n').map((line, index) => (
                  <React.Fragment key={index}>
                    {line}
                    <br />
                  </React.Fragment>
                ))}
              </p>

              {/* 에러일 때만 '확인' 버튼 보임 */}
              {kioskAlert.type === 'error' && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    className="account-btn"
                    onClick={kioskAlert.onConfirm}
                    style={{ backgroundColor: '#495057', flex: 'none', width: '250px', height: '90px', fontSize: '2.5rem', boxShadow: '0 5px 0 #343a40' }}
                  >
                    {t('account_alert_btn_confirm') || '확인'}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default AccountInputModal;