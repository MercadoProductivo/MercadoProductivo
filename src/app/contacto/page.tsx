import type { Metadata } from "next";
import { Mail, Phone, MapPin, Clock, MessageCircle, Send, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import ContactForm from "@/components/contact/contact-form";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contacto | Mercado Productivo",
  description: "Ponte en contacto con el equipo de Mercado Productivo. Estamos aquí para ayudarte.",
};

export default function ContactoPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 py-16 sm:py-20 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-orange-300/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full mb-6">
            <MessageCircle className="h-4 w-4" />
            Estamos aquí para ayudarte
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Contáctanos
          </h1>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">
            ¿Tienes preguntas, sugerencias o necesitas soporte? Nuestro equipo está listo para asistirte.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="relative -mt-10 pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-3">

            {/* Contact Info Cards */}
            <div className="lg:col-span-1 space-y-4">
              {/* Email Card */}
              <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                      <Mail className="h-6 w-6 text-orange-600 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Email</h3>
                      <div className="space-y-1">
                        <a href="mailto:info@mercadoproductivo.com" className="text-sm text-muted-foreground hover:text-orange-600 transition-colors block">
                          info@mercadoproductivo.com
                        </a>
                        <a href="mailto:soporte@mercadoproductivo.com" className="text-sm text-muted-foreground hover:text-orange-600 transition-colors block">
                          soporte@mercadoproductivo.com
                        </a>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Phone Card */}
              <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center group-hover:bg-green-500 transition-colors">
                      <Phone className="h-6 w-6 text-green-600 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Teléfono</h3>
                      <div className="space-y-1">
                        <a href="tel:+541112345678" className="text-sm text-muted-foreground hover:text-green-600 transition-colors block">
                          +54 11 1234-5678
                        </a>
                        <a href="tel:+541187654321" className="text-sm text-muted-foreground hover:text-green-600 transition-colors block">
                          +54 11 8765-4321
                        </a>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Address Card */}
              <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                      <MapPin className="h-6 w-6 text-blue-600 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Dirección</h3>
                      <p className="text-sm text-muted-foreground">
                        Av. Corrientes 1234, Piso 5<br />
                        Buenos Aires, Argentina<br />
                        C1043AAZ
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Hours Card */}
              <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-purple-500 transition-colors">
                      <Clock className="h-6 w-6 text-purple-600 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Horario de Atención</h3>
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        <p>Lun - Vie: 9:00 - 18:00</p>
                        <p>Sábados: 9:00 - 14:00</p>
                        <p className="text-muted-foreground/70">Domingos: Cerrado</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Social Links */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-slate-900 to-slate-800">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-white mb-4">Síguenos</h3>
                  <div className="flex gap-3">
                    {[
                      { href: "#", icon: Facebook, label: "Facebook", color: "hover:bg-blue-600" },
                      { href: "#", icon: Twitter, label: "Twitter", color: "hover:bg-sky-500" },
                      { href: "#", icon: Instagram, label: "Instagram", color: "hover:bg-pink-600" },
                      { href: "#", icon: Linkedin, label: "LinkedIn", color: "hover:bg-blue-700" },
                    ].map((social) => (
                      <Link
                        key={social.label}
                        href={social.href}
                        aria-label={social.label}
                        className={`flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white transition-all ${social.color}`}
                      >
                        <social.icon className="h-5 w-5" />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-xl">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                      <Send className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Envíanos un mensaje</h2>
                      <p className="text-sm text-muted-foreground">Te responderemos a la brevedad</p>
                    </div>
                  </div>
                  <ContactForm />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ CTA Section */}
      <section className="bg-muted/50 py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">
            ¿Tienes preguntas frecuentes?
          </h2>
          <p className="text-muted-foreground mb-6">
            Visita nuestra sección de preguntas frecuentes donde respondemos las consultas más comunes.
          </p>
          <Link
            href="/faq"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Ver Preguntas Frecuentes
          </Link>
        </div>
      </section>
    </div>
  );
}
