import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css"; // biarin kalau kamu pakai Tailwind/CSS

const rootEl = document.getElementById("root")!;
ReactDOM.createRoot(rootEl).render(<App />);
