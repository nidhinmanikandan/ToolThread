import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

const roles = ["Frontend Developer", "UI/UX Designer", "AI Engineer", "Mobile Developer"];
const interests = ["Design", "Development", "AI", "Productivity"];

const levels = ["Beginner", "Intermediate", "Advanced"];

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const [step, setStep] = useState(1);

  const [role, setRole] = useState("");
  const [interest, setInterest] = useState("");
  const [level, setLevel] = useState("");
  const navigate = useNavigate();

  console.log("Next clicked");
  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      await fetch("http://localhost:5000/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: 1,
          role,
          interest,
          level,
        }),
      });
      navigate({
        to: "/",
      });

      console.log("Profile Saved");
    }
  };
  return (
    <div className="space-y-3 mt-8 p-10">
      <h1 className="text-4xl font-bold mb-3">What do you want to become?</h1>

      <p className="text-muted-foreground mb-8">We'll personalize your learning journey.</p>
      {step === 1 && (
        <>
          {roles.map((roleOption) => (
            <button
              key={roleOption}
              onClick={() => {
                setRole(roleOption);
                console.log("Role clicked:", roleOption);
              }}
              className={`block w-full rounded-xl p-4 text-left ${
                role === roleOption ? "bg-purple-600" : "bg-card"
              }`}
            >
              {roleOption}
            </button>
          ))}
        </>
      )}
      {step === 2 && (
        <>
          <h1 className="text-4xl font-bold mb-3">What interests you?</h1>

          {interests.map((interestOption) => (
            <button
              key={interestOption}
              onClick={() => {
                setInterest(interestOption);
                console.log("Interest clicked:", interestOption);
              }}
              className={`block w-full rounded-xl p-4 text-left ${
                interest === interestOption ? "bg-purple-600" : "bg-card"
              }`}
            >
              {interestOption}
            </button>
          ))}
        </>
      )}
      {step === 3 && (
        <>
          <h1 className="text-4xl font-bold mb-3">What is your level?</h1>

          {levels.map((levelOption) => (
            <button
              key={levelOption}
              onClick={() => {
                setLevel(levelOption);
                console.log("Level clicked:", levelOption);
              }}
              className={`block w-full rounded-xl p-4 text-left ${
                level === levelOption ? "bg-purple-600" : "bg-card"
              }`}
            >
              {levelOption}
            </button>
          ))}
        </>
      )}

      <button onClick={handleNext}>Next</button>
    </div>
  );
}
