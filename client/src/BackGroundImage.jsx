import Lottie from "react-lottie";
import BackGroundImageAnimationData from "./lottie/BackGroundImage.json";

export default function BackGroundImage() {
  const BackGroundImageAnimationdefaultOptions = {
    loop: true,
    autoplay: true,
    animationData: BackGroundImageAnimationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };
  return (
    <div className="opacity-30">
      <Lottie
        options={BackGroundImageAnimationdefaultOptions}
        height={500}
        width={500}
        className="text-center w-full opacity-0"
      />
    </div>
  );
}
