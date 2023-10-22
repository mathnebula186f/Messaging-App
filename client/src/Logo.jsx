import Lottie from "react-lottie";
import LogoAnimationData from "./lottie/Logo.json";
import './index.css';

export default function Logo() {
  const LogoAnimationdefaultOptions = {
    loop: true,
    autoplay: true,
    animationData: LogoAnimationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

  return (
    <div className="p-4 flex items-center m-0 font-montserrat">
      <h1 className="text-3xl font-bold  myLogo">Proximity App</h1>
      <Lottie options={LogoAnimationdefaultOptions} height={100} width={100} />
    </div>
  );
}
