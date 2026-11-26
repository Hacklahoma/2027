export default function Footer() {
  return (
    <footer className="footer wrap">
      <div className="foot-main">
        <div>
          <a className="wordmark" href="#top">hacklahoma</a>
          <p>Made for curious minds in Oklahoma.</p>
        </div>
        <div className="foot-right">
          <ul>
            <li><a href="#faq">FAQ</a></li>
          </ul>
          <p className="foot-line">Where worlds meet.</p>
        </div>
      </div>
      <div className="foot-fine">
        <span>© 2027 Hacklahoma · University of Oklahoma</span>
        <a href="mailto:hacklahoma@ou.edu">hacklahoma@ou.edu</a>
        <a href="https://mlh.io/code-of-conduct" target="_blank" rel="noopener">MLH Code of Conduct</a>
      </div>
    </footer>
  );
}
