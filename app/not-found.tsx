import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x py-24 text-center" data-testid="not-found">
      <p className="text-8xl font-black">404</p>
      <p className="mt-4 text-lg">This page skipped leg day. It doesn&apos;t exist.</p>
      <Link href="/shop" className="btn-primary mt-8">Back to the shop</Link>
    </div>
  );
}
