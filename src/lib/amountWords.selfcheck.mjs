// Runnable: `node src/lib/amountWords.selfcheck.mjs`. Mirrors amountWords.ts.
import assert from "node:assert";

const ONES = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
const TENS = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
const below100 = (n) => n < 20 ? ONES[n] : TENS[Math.floor(n/10)] + (n%10 ? " "+ONES[n%10] : "");
const below1000 = (n) => { const h=Math.floor(n/100), r=n%100; let s=""; if(h) s+=ONES[h]+" Hundred"; if(r) s+=(h?" ":"")+below100(r); return s; };
function rupeesInWords(amount){
  const n=Math.floor(Math.abs(amount)); if(n===0) return "Rupees Zero Only";
  let rem=n; const crore=Math.floor(rem/10000000); rem%=10000000;
  const lakh=Math.floor(rem/100000); rem%=100000;
  const thousand=Math.floor(rem/1000); rem%=1000;
  const parts=[]; if(crore) parts.push(below1000(crore)+" Crore");
  if(lakh) parts.push(below100(lakh)+" Lakh");
  if(thousand) parts.push(below100(thousand)+" Thousand");
  if(rem) parts.push(below1000(rem));
  return "Rupees "+parts.join(" ")+" Only";
}

assert.equal(rupeesInWords(12500), "Rupees Twelve Thousand Five Hundred Only");
assert.equal(rupeesInWords(0), "Rupees Zero Only");
assert.equal(rupeesInWords(45), "Rupees Forty Five Only");
assert.equal(rupeesInWords(100), "Rupees One Hundred Only");
assert.equal(rupeesInWords(101), "Rupees One Hundred One Only");
assert.equal(rupeesInWords(1000), "Rupees One Thousand Only");
assert.equal(rupeesInWords(125000), "Rupees One Lakh Twenty Five Thousand Only");
assert.equal(rupeesInWords(10000000), "Rupees One Crore Only");
assert.equal(rupeesInWords(12345678), "Rupees One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Only");

console.log("amountWords.selfcheck: all assertions passed");
