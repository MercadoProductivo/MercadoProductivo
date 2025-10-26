import Link from "next/link";
import Image from "next/image";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <div className="relative w-8 h-8 flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg">
        <span className="text-white font-bold text-sm">MP</span>
      </div>
      <span className="font-bold text-lg hidden sm:block">Mercado Productivo</span>
    </Link>
  );
}
