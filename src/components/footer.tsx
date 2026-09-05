import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-grid">
          <div className="footer-section">
            <h3>বিড়াল পালন ও চিকিৎসা</h3>
            <p style={{ color: '#d8e8dc', fontSize: '0.95rem', lineHeight: 1.6, margin: '12px 0 0' }}>
              Dr. Bala G লিখিত ৩২৬ পৃষ্ঠার ব্যবহারিক বাংলা গাইড।
            </p>
            <p style={{ color: '#a0aba7', fontSize: '0.85rem', margin: '12px 0 0' }}>
              সারা বাংলাদেশে নিরাপদ ডেলিভারি।
            </p>
          </div>

          <div className="footer-section">
            <h3>গ্রাহক সেবা</h3>
            <ul>
              <li>
                <a href="tel:01575008300">ফোন: 01575008300</a>
              </li>
              <li style={{ marginTop: '8px', color: '#a0aba7', fontSize: '0.85rem' }}>
                সোমবার – শুক্রবার
                <br />
                সকাল ৯টা – সন্ধ্যা ৬টা
              </li>
              <li style={{ marginTop: '12px' }}>
                <Link href="/track">অর্ডার ট্র্যাক করুন</Link>
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h3>নীতি ও তথ্য</h3>
            <ul>
              <li>
                <Link href="/privacy">গোপনীয়তা নীতি</Link>
              </li>
              <li>
                <Link href="/terms">শর্তাবলী</Link>
              </li>
              <li>
                <Link href="/delivery-policy">ডেলিভারি নীতি</Link>
              </li>
              <li>
                <Link href="/refund-cancellation">রিফান্ড ও বাতিল নীতি</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-divider"></div>

        <div className="footer-bottom">
          <p>© {currentYear} Dr. Bala G. সর্বাধিকার সংরক্ষিত।</p>
          <p>
            বইটি শিক্ষামূলক উদ্দেশ্যে। পশুচিকিৎসকের পরামর্শ নিন জরুরি সমস্যার জন্য।
          </p>
        </div>
      </div>
    </footer>
  );
}
