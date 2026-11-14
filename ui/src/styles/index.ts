const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export const SHOP_CSS = `
@keyframes sh-up   { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
@keyframes sh-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes sh-pop  { 0% { transform: scale(1) } 40% { transform: scale(1.3) } 100% { transform: scale(1) } }
@keyframes sh-toast { 0% { opacity: 0; transform: translate(-50%, 8px) } 10%, 85% { opacity: 1; transform: translate(-50%, 0) } 100% { opacity: 0; transform: translate(-50%, 4px) } }

.sh-reveal { opacity: 0; animation: sh-up 0.8s ${EASE} forwards; animation-delay: var(--d, 0s) }
.sh-fade   { animation: sh-fade 0.4s ease-out both }
.sh-pop    { animation: sh-pop 0.35s ease-out }
.sh-toast  { animation: sh-toast 2.2s ease forwards }

.sh-acc { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.45s ${EASE} }
.sh-acc[data-open="true"] { grid-template-rows: 1fr }
.sh-acc > div { overflow: hidden; min-height: 0 }

/* dual price slider */
.sh-range { position: relative; height: 20px }
.sh-range input {
  position: absolute; inset: 0; width: 100%; height: 20px; margin: 0;
  appearance: none; -webkit-appearance: none; background: transparent; pointer-events: none;
}
.sh-range input::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none; pointer-events: auto; cursor: pointer;
  width: 16px; height: 16px; border-radius: 50%; background: #171717;
  border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0,0,0,0.15);
}
.sh-range input::-moz-range-thumb {
  pointer-events: auto; cursor: pointer; width: 12px; height: 12px; border-radius: 50%;
  background: #171717; border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0,0,0,0.15);
}
.sh-range input::-webkit-slider-runnable-track { background: transparent }
.sh-range input::-moz-range-track { background: transparent }

@media (prefers-reduced-motion: reduce) {
  .sh-reveal { animation: none; opacity: 1; transform: none }
  .sh-fade, .sh-pop, .sh-toast { animation: none }
  .sh-acc { transition: none }
}
`;

export const CONTACT_CSS = `
@keyframes cn-up   { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
@keyframes cn-pop  { 0% { transform: scale(0.6); opacity: 0 } 60% { transform: scale(1.1) } 100% { transform: scale(1); opacity: 1 } }
@keyframes cn-pulse { 0% { box-shadow: 0 0 0 0 rgba(5, 150, 105, 0.5) } 100% { box-shadow: 0 0 0 8px rgba(5, 150, 105, 0) } }

.cn-reveal { opacity: 0 }
.cn-in .cn-reveal { animation: cn-up 0.9s ${EASE} forwards; animation-delay: var(--d, 0s) }
.cn-pop { animation: cn-pop 0.6s ${EASE} both }
.cn-live { animation: cn-pulse 1.8s ease-out infinite }

@media (prefers-reduced-motion: reduce) {
  .cn-reveal, .cn-in .cn-reveal { animation: none; opacity: 1; transform: none }
  .cn-pop, .cn-live { animation: none }
}
`;

export const CLOSET_CSS = `
@keyframes cl-up    { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
@keyframes cl-fade  { from { opacity: 0 } to { opacity: 1 } }
@keyframes cl-wipe  { from { clip-path: inset(0 0 100% 0) } to { clip-path: inset(0 0 0 0) } }
@keyframes cl-toast { 0% { opacity: 0; transform: translate(-50%, -8px) } 10%, 88% { opacity: 1; transform: translate(-50%, 0) } 100% { opacity: 0; transform: translate(-50%, -4px) } }

.cl-reveal { opacity: 0; animation: cl-up 0.9s ${EASE} forwards; animation-delay: var(--d, 0s) }
.cl-wipe   { animation: cl-wipe 1.1s cubic-bezier(0.65, 0, 0.35, 1) both }
.cl-fade   { animation: cl-fade 0.45s ease-out both }
.cl-toast  { animation: cl-toast 2.2s ease forwards }

/* Closet tray: wipes out from the magnifier button */
.cl-tray {
  clip-path: inset(0 100% 0 0 round 1rem);
  opacity: 0;
  visibility: hidden;
  transition: clip-path 0.65s ${EASE}, opacity 0.35s ease, visibility 0s linear 0.65s;
}
.cl-tray[data-open="true"] {
  clip-path: inset(0 0 0 0 round 1rem);
  opacity: 1;
  visibility: visible;
  transition: clip-path 0.65s ${EASE}, opacity 0.35s ease, visibility 0s;
}
.cl-tray-item {
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.cl-tray[data-open="true"] .cl-tray-item {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.5s ease, transform 0.6s ${EASE};
  transition-delay: calc(0.18s + var(--i, 0) * 0.05s);
}

.cl-spin { transition: transform 0.5s ${EASE} }

/* Accordion */
.cl-acc { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.45s ${EASE} }
.cl-acc[data-open="true"] { grid-template-rows: 1fr }
.cl-acc > div { overflow: hidden; min-height: 0 }

.cl-scroll { scrollbar-width: none }
.cl-scroll::-webkit-scrollbar { display: none }

@media (prefers-reduced-motion: reduce) {
  .cl-reveal { animation: none; opacity: 1; transform: none }
  .cl-wipe, .cl-fade, .cl-toast { animation: none }
  .cl-tray, .cl-tray[data-open="true"], .cl-tray-item, .cl-tray[data-open="true"] .cl-tray-item,
  .cl-spin, .cl-acc { transition: none }
}
`;

export const ANIMATION_CSS = `
@keyframes elevn-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes elevn-rise { from { transform: translateY(110%) } to { transform: translateY(0) } }
@keyframes elevn-up   { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
.elevn-fade  { opacity: 0; animation: elevn-fade 0.9s ease-out 0.1s forwards }
.elevn-line  { display: block; transform: translateY(110%); animation: elevn-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards }
.elevn-up    { opacity: 0; animation: elevn-up 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards }
@media (prefers-reduced-motion: reduce) {
  .elevn-fade, .elevn-line, .elevn-up {
    animation: none; opacity: 1; transform: none;
  }
}
`;

export const PAGE_CSS = `
@keyframes pp-up    { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
@keyframes pp-fade  { from { opacity: 0 } to { opacity: 1 } }
@keyframes pp-wipe  { from { clip-path: inset(0 0 100% 0) } to { clip-path: inset(0 0 0 0) } }
@keyframes pp-shake { 0%, 100% { transform: translateX(0) } 25% { transform: translateX(-6px) } 75% { transform: translateX(6px) } }
@keyframes pp-pop   { 0% { transform: scale(1) } 40% { transform: scale(1.3) } 100% { transform: scale(1) } }

.pp-reveal { opacity: 0; animation: pp-up 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards; animation-delay: var(--d, 0s) }
.pp-wipe   { animation: pp-wipe 1.1s cubic-bezier(0.65, 0, 0.35, 1) both }
.pp-fade   { animation: pp-fade 0.5s ease-out both }
.pp-shake  { animation: pp-shake 0.4s ease-in-out }
.pp-pop    { animation: pp-pop 0.35s ease-out }
.pp-scroll-reveal { opacity: 0 }
.pp-in .pp-scroll-reveal { animation: pp-up 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards; animation-delay: var(--d, 0s) }
.pp-scroller { scrollbar-width: none }
.pp-scroller::-webkit-scrollbar { display: none }
.pp-zoom {
  transition: transform 1.2s ease;
}
.pp-zoom-container:hover .pp-zoom {
  transform: scale(1.5);
}

@media (prefers-reduced-motion: reduce) {
  .pp-reveal, .pp-scroll-reveal, .pp-in .pp-scroll-reveal { animation: none; opacity: 1; transform: none }
  .pp-wipe, .pp-fade, .pp-shake, .pp-pop { animation: none }
}
`;