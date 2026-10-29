import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const styles = {
  wrap: { maxWidth: '540px', margin: '40px auto', padding: '20px', fontFamily: 'Inter, Arial, sans-serif', background: '#0d1b2a', color: '#e0e0e0', minHeight: '100vh', scrollBehavior: 'smooth' },
  card: { background: '#1b3b5a', border: '1px solid #223a5a', borderRadius: '16px', padding: '18px', boxShadow: '0 6px 15px rgba(0,0,0,0.3)', transition: 'all 0.4s ease' },
  title: { fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', color: '#ffffff' },
  label: { display: 'block', fontSize: '12px', color: '#c8d6e5', marginBottom: '6px' },
  input: { width: '100%', padding: '12px 14px', border: '1px solid #223a5a', borderRadius: '12px', marginBottom: '12px', background: '#102c44', color: '#e0e0e0', outline: 'none', transition: 'all 0.4s ease', boxShadow: '0 4px 10px rgba(0,0,0,0.3)',maxWidth: '96%' },
  button: { padding: '12px 16px', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg, #00bcd4, #2196f3)', color: '#0d1b2a', cursor: 'pointer', boxShadow: '0 6px 15px rgba(0,0,0,0.3)', transition: 'all 0.4s ease', fontWeight: 600 },
  secondary: { background: '#223a5a', color: '#e0e0e0', border: '1px solid #2b4f73', marginLeft: '8px' },
  message: { marginTop: '10px', fontSize: '12px', background: 'rgba(0,188,212,0.08)', border: '1px solid rgba(0,188,212,0.35)', padding: '10px', borderRadius: '12px', boxShadow: '0 0 18px rgba(0,188,212,0.25)' }
};

const StudentRegister = () => {
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5555';
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', age: '', email: '', password: '' });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/student/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, age: form.age ? Number(form.age) : undefined })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setMsg('Registration successful. Please login.');
      setTimeout(() => navigate('/student/login'), 600);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.title}>🎓 Student Register</div>
        <form onSubmit={onSubmit}
          onMouseEnter={(e) => { e.currentTarget.parentElement.style.transform = 'translateY(-4px)'; }}
          onMouseLeave={(e) => { e.currentTarget.parentElement.style.transform = 'translateY(0)'; }}
        >
          <label style={styles.label}>Name</label>
          <input name="name" value={form.name} onChange={onChange} style={styles.input} required
            onFocus={(e) => { e.target.style.borderColor = '#2196F3'; e.target.style.boxShadow = '0 0 0 4px rgba(33,150,243,0.15)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#2a2a2a'; e.target.style.boxShadow = '0 4px 10px rgba(0,0,0,0.35)'; }}
          />
          <label style={styles.label}>Age</label>
          <input name="age" value={form.age} onChange={onChange} style={styles.input} type="number" min="1"
            onFocus={(e) => { e.target.style.borderColor = '#2196F3'; e.target.style.boxShadow = '0 0 0 4px rgba(33,150,243,0.15)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#2a2a2a'; e.target.style.boxShadow = '0 4px 10px rgba(0,0,0,0.35)'; }}
          />
          <label style={styles.label}>Email</label>
          <input name="email" value={form.email} onChange={onChange} style={styles.input} type="email" required
            onFocus={(e) => { e.target.style.borderColor = '#2196F3'; e.target.style.boxShadow = '0 0 0 4px rgba(33,150,243,0.15)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#2a2a2a'; e.target.style.boxShadow = '0 4px 10px rgba(0,0,0,0.35)'; }}
          />
          <label style={styles.label}>Password</label>
          <input name="password" value={form.password} onChange={onChange} style={styles.input} type="password" required
            onFocus={(e) => { e.target.style.borderColor = '#2196F3'; e.target.style.boxShadow = '0 0 0 4px rgba(33,150,243,0.15)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#2a2a2a'; e.target.style.boxShadow = '0 4px 10px rgba(0,0,0,0.35)'; }}
          />
          {/* Photo input removed: students will upload photo after login */}
          <button type="submit" style={styles.button} disabled={loading}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 30px rgba(33,150,243,0.35)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(33,150,243,0.25)'; }}
          >{loading ? 'Submitting…' : 'Register'}</button>
          <button type="button" style={{ ...styles.button, ...styles.secondary }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            onClick={() => navigate('/student/login')}
          >Go to Login</button>
        </form>
        {msg && <div style={styles.message}>{msg}</div>}
      </div>
    </div>
  );
};

export default StudentRegister;
