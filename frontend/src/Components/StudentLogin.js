import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const styles = {
  wrap: { maxWidth: '520px', margin: '40px auto', padding: '24px', fontFamily: 'Inter, Arial, sans-serif', background: '#0d1b2a', color: '#e0e0e0', minHeight: '100vh', scrollBehavior: 'smooth' },
  card: { background: '#1b3b5a', border: '1px solid #223a5a', borderRadius: '16px', padding: '20px', boxShadow: '0 6px 15px rgba(0,0,0,0.3)', transition: 'all 0.4s ease' },
  title: { fontSize: '22px', fontWeight: 'bold', marginBottom: '12px', color: '#ffffff' },
  label: { display: 'block', fontSize: '12px', color: '#c8d6e5', marginBottom: '6px' },
  input: { width: '96%', padding: '12px 14px', border: '1px solid #223a5a', borderRadius: '12px', marginBottom: '12px', background: '#102c44', color: '#e0e0e0', outline: 'none', transition: 'all 0.4s ease', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' },
  button: { padding: '12px 18px', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg, #00bcd4, #2196f3)', color: '#0d1b2a', cursor: 'pointer', boxShadow: '0 6px 15px rgba(0,0,0,0.3)', transition: 'all 0.4s ease', fontWeight: 600 },
  secondary: { background: '#223a5a', color: '#e0e0e0', border: '1px solid #2b4f73', marginLeft: '8px' },
  message: { marginTop: '12px', fontSize: '12px', background: 'rgba(0,188,212,0.08)', border: '1px solid rgba(0,188,212,0.35)', padding: '10px', borderRadius: '12px', boxShadow: '0 0 18px rgba(0,188,212,0.25)' }
};

const StudentLogin = () => {
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5555';
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/student/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      navigate('/student/dashboard');
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.card}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
      >
        <div style={styles.title}>🎓 Student Login</div>
        <form onSubmit={onSubmit}>
          <label style={styles.label}>Email</label>
          <input name="email" value={form.email} onChange={onChange} style={styles.input} type="email" required
            onFocus={(e) => { e.target.style.outline = '2px solid #00bcd4'; e.target.style.boxShadow = '0 0 0 6px rgba(0,188,212,0.18)'; }}
            onBlur={(e) => { e.target.style.outline = 'none'; e.target.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)'; }}
          />
          <label style={styles.label}>Password</label>
          <input name="password" value={form.password} onChange={onChange} style={styles.input} type="password" required
            onFocus={(e) => { e.target.style.outline = '2px solid #00bcd4'; e.target.style.boxShadow = '0 0 0 6px rgba(0,188,212,0.18)'; }}
            onBlur={(e) => { e.target.style.outline = 'none'; e.target.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)'; }}
          />
          <button type="submit" style={styles.button} disabled={loading}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
          >{loading ? 'Logging in…' : 'Login'}</button>
          <button type="button" style={{ ...styles.button, ...styles.secondary }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
            onClick={() => navigate('/student/register')}
          >Go to Register</button>
        </form>
        {msg && <div style={styles.message}>{msg}</div>}
      </div>
    </div>
  );
};

export default StudentLogin;
