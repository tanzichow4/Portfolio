import './AboutSite.css';
import { SITE_COPY, VERSION } from '../data';

export default function AboutSite() {
  return (
    <div className="site-body">
      <div className="site-mark" aria-hidden="true">
        {SITE_COPY.mark}
      </div>
      <h2 className="site-title">{SITE_COPY.title}</h2>
      <div className="site-version">
        {SITE_COPY.versionPrefix}
        {VERSION}
        {SITE_COPY.edition}
      </div>
      <p className="site-desc">{SITE_COPY.desc}</p>
    </div>
  );
}
