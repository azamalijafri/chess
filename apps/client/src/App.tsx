import { Route, Routes } from "react-router-dom";
import { Landing } from "./screens/Landing";
import { Game } from "./screens/Game";
import Navbar from "./components/navbar";

const App = () => {
  return (
    <div className="bg-primary h-full">
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/game/:gameId" element={<Game />} />
      </Routes>
    </div>
  );
};

export default App;
