import { ReviewForm } from "@/components/review-form";
import Link from "next/link";
export default function ReviewPage() { return <main className="checkout-page"><div className="page-shell track-shell"><Link href="/" className="back-link">← Back to book</Link><h1>Review your book</h1><p>শুধু Delivered অর্ডারের ক্রেতারা রিভিউ দিতে পারবেন।</p><ReviewForm /></div></main>; }
