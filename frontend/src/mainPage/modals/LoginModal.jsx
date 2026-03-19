// src/mainPage/modals/LoginModal.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LoginModal.css';
import AccountInputModal from './AccountInputModal'; // ★ 계좌 모달 컴포넌트 불러오기

const LoginModal = ({ onClose }) => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 처음부터 'userId'가 선택된 상태로 시작 (키보드 항상 노출)
  const [activeField, setActiveField] = useState('userId'); 
  const [isShift, setIsShift] = useState(false);
  
  // ★ 로그인 성공 후 계좌 모달을 띄우기 위한 상태
  const [showAccountModal, setShowAccountModal] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!userId || !password) {
      alert("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post('http://localhost:8080/api/v1/proxy/user/login', {
        id: userId,
        password: password
      });

      if (response.data.status == 200 || response.data.message.includes("성공")) {
        const userData = response.data.data;
        
        localStorage.setItem('fisherman_id', userData.user_fshnd_no);
        localStorage.setItem('fisherman_name', userData.mbr_nm);
        localStorage.setItem('mbr_no', userData.mbr_no);
        localStorage.setItem('is_member', 'true'); 
        
        if (userData.actno) {
          localStorage.setItem('bank_cd', userData.bank_cd || '');
          localStorage.setItem('actno', userData.actno);
          localStorage.setItem('acct_nm', userData.dpstr_nm || userData.mbr_nm || '');
        }

        // ★ [변경됨] 로그인 성공 알림 후, 페이지 이동 대신 계좌 모달 띄우기
        alert(`${userData.mbr_nm}님 환영합니다!`);
        setShowAccountModal(true); 

      } else {
        alert("아이디 또는 비밀번호가 일치하지 않습니다.");
      }
    } catch (error) {
      console.error("로그인 에러:", error);
      alert("로그인 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (key) => {
    const setter = activeField === 'userId' ? setUserId : setPassword;
    const value = activeField === 'userId' ? userId : password;

    if (key === 'DEL') {
      setter(value.slice(0, -1));
    } else if (key === 'CLEAR') {
      setter('');
    } else if (key === 'SHIFT') {
      setIsShift(!isShift);
    } else if (key === 'SPACE') {
      setter(value + ' ');
    } else {
      setter(value + key);
    }
  };

  const renderKeyboard = () => {
    // 사진과 동일한 키보드 배열
    const layoutNormal = [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['SHIFT', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'DEL'],
      ['!', '@', '#', '$', '%', '^', '&', '*', 'SPACE', 'CLEAR']
    ];
    
    const layoutShift = [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['SHIFT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL'],
      ['!', '@', '#', '$', '%', '^', '&', '*', 'SPACE', 'CLEAR'] // 특수문자는 그대로
    ];

    const currentLayout = isShift ? layoutShift : layoutNormal;

    return (
      <div className="vkb-container">
        {currentLayout.map((row, rowIndex) => (
          <div key={rowIndex} className="vkb-row">
            {row.map((key) => {
              let keyClass = 'vkb-key';
              let displayKey = key;

              if (key === 'SHIFT') {
                keyClass += isShift ? ' special wide shift-active' : ' special wide';
                displayKey = '⇧ Shift';
              } else if (key === 'DEL') {
                keyClass += ' special wide';
                displayKey = '⌫ 지우기';
              } else if (key === 'CLEAR') {
                keyClass += ' special wide';
                displayKey = '초기화';
              } else if (key === 'SPACE') {
                keyClass += ' space';
                displayKey = '공백';
              }

              return (
                <button
                  key={key}
                  type="button"
                  className={keyClass}
                  onClick={(e) => { e.preventDefault(); handleKeyPress(key); }}
                >
                  {displayKey}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // ★ 로그인 성공 시, 로그인 폼 대신 계좌 확인 모달을 렌더링합니다.
  if (showAccountModal) {
    // AccountInputModal이 끝나면 onClose를 호출해 전체 모달을 닫습니다.
    return <AccountInputModal onClose={onClose} />;
  }

  return (
    <div className="login-modal-backdrop" onClick={onClose}>
      <div className="login-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="login-modal-title">사용자 로그인</h2>
        
        <form onSubmit={handleLoginSubmit}>
          
          <div className="login-input-row">
            <div className="login-input-group">
              <label>아이디</label>
              <input 
                type="text" 
                readOnly 
                value={userId} 
                onClick={() => setActiveField('userId')} 
                placeholder="터치하여 아이디 입력" 
                className={`login-input ${activeField === 'userId' ? 'active' : ''}`}
              />
            </div>
            
            <div className="login-input-group">
              <label>비밀번호</label>
              <input 
                type="password" 
                readOnly 
                value={password} 
                onClick={() => setActiveField('password')} 
                placeholder="터치하여 비밀번호 입력" 
                className={`login-input ${activeField === 'password' ? 'active' : ''}`}
              />
            </div>
          </div>

          {/* 사진처럼 항상 키보드가 보여집니다 */}
          {renderKeyboard()}
          
          <div className="login-actions">
            <button type="submit" disabled={isLoading} className="login-btn-submit">
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
            <button type="button" onClick={onClose} className="login-btn-cancel">
              취소
            </button>
          </div>
          
        </form>
      </div>
    </div>
  );
};

export default LoginModal;