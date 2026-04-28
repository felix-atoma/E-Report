import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <span>© {new Date().getFullYear()} NovaBulletin</span>
      <span className="footer__sep">·</span>
      <span>v0.1.0</span>
    </footer>
  );
}

export default Footer;
