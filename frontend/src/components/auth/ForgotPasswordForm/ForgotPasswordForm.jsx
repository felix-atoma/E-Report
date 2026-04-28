import { useState } from 'react';
import { authService } from '../../../services/authService';
import Input from '../../common/Input/Input';
import Button from '../../common/Button/Button';
import './ForgotPasswordForm.css';

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch {
      setError('Une erreur est survenue. Vérifiez votre adresse email.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="forgot-password-form__success">
        <p>✅ Un lien de réinitialisation a été envoyé à <strong>{email}</strong>.</p>
        <p>Vérifiez votre boîte mail.</p>
      </div>
    );
  }

  return (
    <form className="forgot-password-form" onSubmit={handleSubmit} noValidate>
      <Input
        id="email"
        label="Adresse email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />
      {error && <p className="forgot-password-form__error" role="alert">{error}</p>}
      <Button type="submit" variant="primary" disabled={loading} style={{ width: '100%' }}>
        {loading ? 'Envoi…' : 'Envoyer le lien'}
      </Button>
    </form>
  );
}

export default ForgotPasswordForm;
