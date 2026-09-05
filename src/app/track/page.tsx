import { TrackForm } from "@/components/track-form";
import Link from "next/link";
export default function TrackPage() { return <main className="checkout-page"><div className="page-shell track-shell"><Link href="/" className="back-link">← Back to book</Link><h1>Track your order</h1><p>আপনার অর্ডার নম্বর এবং অর্ডারে ব্যবহৃত মোবাইল নম্বর দিন।</p><TrackForm /></div></main>; }
