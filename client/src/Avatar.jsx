import Lottie from "react-lottie";
import Avatar1AnimationData from "./lottie/Avatar1.json";

export default function Avatar({ userId, username }) {
  const Avatar1AnimationdefaultOptions = {
    loop: true,
    autoplay: true,
    animationData: Avatar1AnimationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };
  const colors = [
    "bg-green-200",
    "bg-red-200",
    "bg-purple-200",
    "bg-blue-200",
    "bg-yellow-200",
    "bg-teal-200",
  ];
  const userIdBase10 = parseInt(userId, 16);
  const colorIndex = userIdBase10 % colors.length;
  const color = colors[colorIndex];
  return (
    <div className={"w-8 h-8 b rounded-full  flex item-center bg-blue-50"}>
      {/* <div className="text-center w-full opacity-70">{username[0]}</div> */}
      <Lottie
        options={Avatar1AnimationdefaultOptions}
        height={40}
        width={40}
        className="text-center w-full opacity-70"
      />
    </div>
  );
}
