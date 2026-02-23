import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
            <h2 className="text-4xl font-bold text-[#f06d04]">404</h2>
            <p className="text-xl text-muted-foreground">No pudimos encontrar la página que buscas.</p>
            <Link
                href="/"
                className="mt-4 px-4 py-2 bg-[#f06d04] text-white rounded-md hover:bg-[#f06d04]/90 transition-colors"
            >
                Volver al inicio
            </Link>
        </div>
    )
}
