import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../mainPage/Header';

const AccountScreen = () => {
  const navigate = useNavigate();
  
  // 상태 관리
  const [inputMode, setInputMode] = useState('existing'); // 'existing' (기존 계좌) or 'new' (새 계좌)
  const [hasRegisteredAccount, setHasRegisteredAccount] = useState(false);
  
  // 기존 회원 계좌 정보
  const [regBank, setRegBank] = useState({ cd: '', nm: '', actno: '', acctNm: '' });
  
  // 새 계좌 입력 폼 
  const [banks, setBanks] = useState([]);
  const [bankCd, setBankCd] = useState('');
  const [actno, setActno] = useState('');
  const [acctNm, setAcctNm] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 1. 로그인 시 저장해둔 기존 계좌 정보가 있는지 확인
    const savedActno = localStorage.getItem('reg_actno');
    if (savedActno) {
      setHasRegisteredAccount(true);
      setInputMode('existing');
      setRegBank({
        cd: localStorage.getItem('reg_bank_cd'),
        nm: localStorage.getItem('reg_bank_nm'),
        actno: savedActno,
        acctNm: localStorage.getItem('reg_acct_nm'),
      });
    } else {
      // 비회원이거나 기존 계좌가 없으면 바로 새 계좌 입력 모드로
      setInputMode('new');
    }

    // 2. 은행 목록 불러오기 (새 계좌 입력용)
    axios.get('http://localhost:8080/api/v1/proxy/banks')
      .then(res => {
        if(res.data?.data?.banks) setBanks(res.data.data.banks);
      })
      .catch(err => console.error('은행 목록 로드 실패', err));
  }, []);

  // [기존 계좌 사용] 버튼 클릭 시
  const handleUseExisting = () => {
    // 이미 인증된 계좌이므로 검증(Verify) 없이 바로 다음 화면으로
    localStorage.setItem('bank_cd', regBank.cd);
    localStorage.setItem('actno', regBank.actno);
    localStorage.setItem('acct_nm', regBank.acctNm);
    
    navigate('/gillnet/type-select');
  };

  // [새 계좌 인증] 버튼 클릭 시
  const handleVerifyNew = async () => {
    if (!bankCd || !actno || !acctNm) {
      alert("모든 항목을 입력해주세요.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await axios.post('http://localhost:8080/api/v1/proxy/account/verify', {
        bank_cd: bankCd,
        actno: actno,
        acct_nm: acctNm
      });
      
      if (res.data?.status === "200") {
        localStorage.setItem('bank_cd', res.data.data.bank_cd || bankCd);
        localStorage.setItem('actno', res.data.data.actno || actno);
        localStorage.setItem('acct_nm', res.data.data.acct_nm || acctNm);
        
        alert("계좌 인증이 완료되었습니다.");
        navigate('/gillnet/type-select'); 
      } else {
        alert("계좌 인증에 실패했습니다. 정보를 확인해주세요.");
      }
    } catch (err) {
      alert("서버 오류로 계좌 인증에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', backgroundColor: '#f0f4f8' }}>
      <Header />
      <div style={{ maxWidth: '600px', margin: '50px auto', background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        
        {/* 모드 선택 탭 (회원 계좌가 있을 때만 표시) */}
        {hasRegisteredAccount && (
          <div style={{ display: 'flex', marginBottom: '30px', borderBottom: '2px solid #eee' }}>
            <button 
              onClick={() => setInputMode('existing')}
              style={{ flex: 1, padding: '15px', fontSize: '1.2rem', background: 'none', border: 'none', borderBottom: inputMode === 'existing' ? '4px solid #007BFF' : 'none', color: inputMode === 'existing' ? '#007BFF' : '#888', fontWeight: inputMode === 'existing' ? 'bold' : 'normal', cursor: 'pointer' }}
            >
              기존 등록 계좌
            </button>
            <button 
              onClick={() => setInputMode('new')}
              style={{ flex: 1, padding: '15px', fontSize: '1.2rem', background: 'none', border: 'none', borderBottom: inputMode === 'new' ? '4px solid #007BFF' : 'none', color: inputMode === 'new' ? '#007BFF' : '#888', fontWeight: inputMode === 'new' ? 'bold' : 'normal', cursor: 'pointer' }}
            >
              새 계좌 입력
            </button>
          </div>
        )}

        <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>
          {inputMode === 'existing' ? '환급받을 계좌를 확인해주세요' : '환급받을 새 계좌를 입력해주세요'}
        </h2>
        
        {/* 기존 계좌 화면 */}
        {inputMode === 'existing' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: '#f8f9fa', border: '1px solid #ddd', padding: '30px', borderRadius: '8px', marginBottom: '40px' }}>
              <p style={{ fontSize: '1.2rem', color: '#555', marginBottom: '10px' }}>{regBank.nm}은행</p>
              <h3 style={{ fontSize: '2rem', letterSpacing: '2px', marginBottom: '10px' }}>{regBank.actno}</h3>
              <p style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>예금주: {regBank.acctNm}</p>
            </div>
            
            <button onClick={handleUseExisting} style={{ width: '100%', padding: '20px', backgroundColor: '#007BFF', color: '#fff', fontSize: '1.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              이 계좌로 환급받기
            </button>
          </div>
        )}

        {/* 새 계좌 입력 화면 */}
        {inputMode === 'new' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <label>은행: (필수)</label>
              <select value={bankCd} onChange={(e) => setBankCd(e.target.value)} style={{ width: '100%', padding: '15px', marginTop: '10px', fontSize: '1.2rem' }}>
                <option value="">은행 선택</option>
                {banks.map(b => (
                  <option key={b.bank_cd} value={b.bank_cd}>{b.bank_nm}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label>예금주명: (필수)</label>
              <input type="text" value={acctNm} onChange={(e) => setAcctNm(e.target.value)} placeholder="홍길동" style={{ width: '100%', padding: '15px', marginTop: '10px', fontSize: '1.2rem' }} />
            </div>

            <div style={{ marginBottom: '40px' }}>
              <label>계좌번호: (필수, - 제외)</label>
              <input type="number" value={actno} onChange={(e) => setActno(e.target.value)} placeholder="12345678901" style={{ width: '100%', padding: '15px', marginTop: '10px', fontSize: '1.2rem' }} />
            </div>

            <button onClick={handleVerifyNew} disabled={isLoading} style={{ width: '100%', padding: '20px', backgroundColor: '#000', color: '#fff', fontSize: '1.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              {isLoading ? '인증 중...' : '계좌 인증'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountScreen;