import { Fragment } from "react";
import Script from "next/script";
import type { TrackingPixel } from "@/lib/types";

/**
 * Injects each connected pixel's own base snippet (Meta Pixel, GA4, TikTok
 * Pixel) into the public page — standard, long-stable install snippets from
 * each platform, not a hand-rolled equivalent. `pixel_id` is validated to a
 * safe charset before it's ever stored (see the addPixel action), since it
 * ends up interpolated into an inline <script>.
 */
export function TrackingPixels({ pixels }: { pixels: TrackingPixel[] }) {
  return (
    <>
      {pixels.map((p) => {
        switch (p.provider) {
          case "meta_pixel":
            return (
              <Script
                key={p.id}
                id={`meta-pixel-${p.id}`}
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                  __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${p.pixel_id}');
fbq('track', 'PageView');`,
                }}
              />
            );
          case "ga4":
            return (
              <Fragment key={p.id}>
                <Script
                  src={`https://www.googletagmanager.com/gtag/js?id=${p.pixel_id}`}
                  strategy="afterInteractive"
                />
                <Script
                  id={`ga4-init-${p.id}`}
                  strategy="afterInteractive"
                  dangerouslySetInnerHTML={{
                    __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${p.pixel_id}');`,
                  }}
                />
              </Fragment>
            );
          case "tiktok_pixel":
            return (
              <Script
                key={p.id}
                id={`tiktok-pixel-${p.id}`}
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                  __html: `!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<e.length;n++)ttq.setAndDefer(e,e[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=i+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
  ttq.load('${p.pixel_id}');
  ttq.page();
}(window, document, 'ttq');`,
                }}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
}
