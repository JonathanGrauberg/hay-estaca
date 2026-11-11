// Corre antes de pintar (next/script beforeInteractive en app/layout.tsx): si la
// bienvenida ya se vio en esta sesión del navegador, la oculta con un <style> en el
// <head>, sin tocar el markup (así no rompe la hidratación). Si no, la marca como vista.
export const SCRIPT_BIENVENIDA = `try{if(sessionStorage.getItem("bienvenida")){document.head.insertAdjacentHTML("beforeend","<style>#bienvenida{display:none}</style>")}else{sessionStorage.setItem("bienvenida","1")}}catch(e){}`;
