console.log("MAIN EXECUTING FROM:", import.meta.url);

import { App } from "./app";

console.log("APP IMPORT LOADED:", App);

const root = document.getElementById("app");

console.log("ROOT ELEMENT:", root);

if (root) {
  console.log("CREATING APP NOW");
  new App(root);
}