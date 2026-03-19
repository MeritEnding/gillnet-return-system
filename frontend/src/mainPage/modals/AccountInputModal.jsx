// src/mainPage/modals/AccountInputModal.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AccountInputModal = ({ onClose }) => {
  const navigate = useNavigate();
  const [banks, setBanks] = useState([]);
  const [bankCd, setBankCd] = useState('');
  const [actno, setActno] = useState('');
  const [acctNm, setAcctNm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // 가상 키보드 표시 여부 상태
  const [showKeypad, setShowKeypad] = useState(false);

  // 컴포넌트 마운트 시 은행 목록 조회 및 기존 정보 자동 완성
  useEffect(() => {
    // 1. API 응답으로 저장된 계좌 정보가 있다면 폼에 미리 채워줍니다 (수정 가능하도록 세팅)
    const savedBankCd = localStorage.getItem('bank_cd');
    const savedActno = localStorage.getItem('actno');
    const savedAcctNm = localStorage.getItem('acct_nm') || localStorage.getItem('fisherman_name');

    if (savedBankCd) setBankCd(savedBankCd);
    if (savedActno) setActno(savedActno);
    if (savedAcctNm) setAcctNm(savedAcctNm);

    // 2. 은행 목록 불러오기 [cite: 108, 109, 132]
    const fetchBanks = async () => {
      try {
        const res = await axios.get('http://localhost:8080/api/v1/proxy/banks');
        if (res.data?.data?.banks) {
          setBanks(res.data.data.banks);
        }
      } catch (err) {
        console.error('은행 목록 로드 실패', err);
      }
    };
    fetchBanks();
  }, []);

  // 가상 숫자 키패드 클릭 핸들러
  const handleKeypadClick = (val) => {
    if (val === 'DEL') {
      setActno((prev) => prev.slice(0, -1));
    } else if (val === 'CLEAR') {
      setActno(''); // 전체 지우기 (다른 계좌 입력 시 유용)
    } else if (val === 'CLOSE') {
      setShowKeypad(false);
    } else {
      setActno((prev) => prev + val);
    }
  };

  const renderKeypad = () => {
    const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'CLEAR', 0, 'DEL'];
    return (
      <div style={{ marginTop: '20px', padding: '15px', background: '#f1f3f5', borderRadius: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {keys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleKeypadClick(key)}
              style={{
                padding: '20px', fontSize: '1.8rem', fontWeight: 'bold', cursor: 'pointer', color: '#333',
                backgroundColor: key === 'DEL' || key === 'CLEAR' ? '#dee2e6' : '#fff',
                border: '1px solid #ced4da', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              {key === 'DEL' ? '지우기' : key === 'CLEAR' ? '초기화' : key}
            </button>
          ))}
        </div>
        <button onClick={() => setShowKeypad(false)} style={{ width: '100%', marginTop: '10px', padding: '15px', backgroundColor: '#495057', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.2rem' }}>
          키패드 닫기
        </button>
      </div>
    );
  };

  // 계좌 인증 처리 [cite: 134, 135, 154]
  const handleVerifyAccount = async () => {
    if (!bankCd || !actno || !acctNm) {
      alert("은행, 계좌번호, 예금주명을 모두 입력해주세요.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await axios.post('http://localhost:8080/api/v1/proxy/account/verify', {
        bank_cd: bankCd,
        actno: actno.replace(/-/g, ''), 
        acct_nm: acctNm
      });

      if (res.data?.status === "200" || res.data?.data?.success) {
        localStorage.setItem('bank_cd', res.data.data.bank_cd || bankCd);
        localStorage.setItem('actno', res.data.data.actno || actno);
        localStorage.setItem('acct_nm', res.data.data.acct_nm || acctNm);

        alert("계좌 정보가 확인되었습니다.");
        onClose();
        navigate('/select-gear'); 
      } else {
        alert("계좌 인증에 실패했습니다. 정보를 다시 확인해주세요.");
      }
    } catch (err) {
      alert("서버 오류로 계좌 인증에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ padding: '40px', width: '90%', maxWidth: showKeypad ? '600px' : '500px', background: '#fff', borderRadius: '15px', transition: 'max-width 0.3s' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '1.8rem', color: '#333' }}>
          환급받을 계좌를 확인해 주세요.<br/><span style={{fontSize: '1.2rem', color: '#007BFF'}}>(다른 계좌로 수정 가능합니다)</span>
        </h2>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>은행: (필수)</label>
          <select value={bankCd} onChange={(e) => setBankCd(e.target.value)} style={{ width: '100%', padding: '15px', marginTop: '10px', fontSize: '1.2rem', border: '1px solid #ccc', borderRadius: '5px' }}>
            <option value="">은행 선택</option>
            {banks.map(b => (
              <option key={b.bank_cd} value={b.bank_cd}>{b.bank_nm}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>예금주명: (필수)</label>
          <input type="text" value={acctNm} onChange={(e) => setAcctNm(e.target.value)} placeholder="예: 홍길동" style={{ width: '100%', padding: '15px', marginTop: '10px', fontSize: '1.2rem', border: '1px solid #ccc', borderRadius: '5px' }} />
        </div>

        <div style={{ marginBottom: '30px' }}>
          <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>계좌번호: (터치하여 수정 가능)</label>
          <input 
            type="text" 
            readOnly 
            value={actno} 
            onClick={() => setShowKeypad(true)} 
            placeholder="터치하여 계좌번호 입력" 
            style={{ width: '100%', padding: '15px', marginTop: '10px', fontSize: '1.5rem', letterSpacing: '2px', border: '2px solid #007BFF', borderRadius: '5px', cursor: 'pointer', backgroundColor: '#f8f9fa' }} 
          />
        </div>

        {showKeypad && renderKeypad()}

        <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
          <button onClick={handleVerifyAccount} disabled={isLoading} style={{ flex: 2, padding: '20px', backgroundColor: '#000', color: '#fff', fontSize: '1.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            {isLoading ? '확인 중...' : '이 계좌로 진행'}
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: '20px', backgroundColor: '#6c757d', color: '#fff', fontSize: '1.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountInputModal;