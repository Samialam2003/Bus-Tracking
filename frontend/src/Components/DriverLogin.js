import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // ✅ Link added

const styles = {
  container: { maxWidth: '520px', margin: '40px auto', padding: '20px', fontFamily: 'Inter, Arial, sans-serif', background: '#0d1b2a', color: '#e0e0e0', minHeight: '100vh', scrollBehavior: 'smooth' },
  title: { fontSize: '22px', fontWeight: 'bold', marginBottom: '10px', color: '#ffffff' },
  form: { display: 'grid', gap: '12px', background: '#1b3b5a', border: '1px solid #223a5a', borderRadius: '14px', padding: '16px', boxShadow: '0 6px 15px rgba(0,0,0,0.3)', transition: 'all 0.4s ease' },
  input: { padding: '12px 14px', border: '1px solid #223a5a', borderRadius: '12px', background: '#102c44', color: '#e0e0e0', outline: 'none', transition: 'all 0.4s ease', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' },
  button: { padding: '12px 16px', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg, #00bcd4, #2196f3)', color: '#0d1b2a', cursor: 'pointer', boxShadow: '0 6px 15px rgba(0,0,0,0.3)', transition: 'all 0.4s ease', fontWeight: 600 },
  msg: { marginTop: '10px', fontSize: '13px' },
  link: { marginTop: '10px', fontSize: '14px' }
};

const DriverLogin = () => {
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5555';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [me, setMe] = useState(null);
  const navigate = useNavigate();

  const login = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/driver/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setMessage('Login successful.');

      const r2 = await fetch(`${API_BASE_URL}/driver/me`, { credentials: 'include' });
      const d2 = await r2.json();
      if (r2.ok) {
        setMe(d2.data);
        setTimeout(() => navigate('/driver/dashboard'), 1000);
      }
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.title}>Driver Login</div>
      <form onSubmit={login} style={styles.form}>
        <input style={styles.input} placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required 
          onFocus={(e) => { e.target.style.borderColor = '#2196F3'; e.target.style.boxShadow = '0 0 0 4px rgba(33,150,243,0.15)'; }}
          onBlur={(e) => { e.target.style.borderColor = '#2a2a2a'; e.target.style.boxShadow = '0 4px 10px rgba(0,0,0,0.35)'; }}
        />
        <input style={styles.input} placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required 
          onFocus={(e) => { e.target.style.borderColor = '#2196F3'; e.target.style.boxShadow = '0 0 0 4px rgba(33,150,243,0.15)'; }}
          onBlur={(e) => { e.target.style.borderColor = '#2a2a2a'; e.target.style.boxShadow = '0 4px 10px rgba(0,0,0,0.35)'; }}
        />
        <button type="submit" style={styles.button}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 30px rgba(33,150,243,0.35)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(33,150,243,0.25)'; }}
        >Login</button>
      </form>
      {message && <div style={styles.msg}>{message}</div>}
      {me && (
        <div style={styles.msg}>Logged in as {me.name} ({me.email})</div>
      )}

      {/* ✅ link to register */}
      <div style={styles.link}>
        New here? <Link to="/driver/register">Register</Link>
      </div>
    </div>
  );
};

export default DriverLogin;
