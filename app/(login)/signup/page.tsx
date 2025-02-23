'use client'

import { useState } from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signUp } from "../../../lib/db/actions/actions"

const dataBenefits = [
  {
    title: "Get Started Quickly",
    description: "Connect your accounts in one click."
  },
  {
    title: "Free Up Time",
    description: "Manage scheduling and posts all in one place."
  },
  {
    title: "Analytics and Insights",
    description: "Measure what matters to improve your strategy."
  }
]

export default function PageSignUp({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    const result = await signUp(formData)

    setLoading(false)

    if (result.error) {
      setMessage(result.error)
    } else {
      setMessage("Check your email for a confirmation link.")
    }
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-[1080px] flex flex-row justify-between">

        <div className="w-full">
          {dataBenefits.map((item) => {
            return (
              <div>
                <span>{item.title}</span>
                <p>{item.description}</p>
              </div>
            )
          })}
        </div>

        <div className={cn("flex flex-col gap-3 w-full", className)} {...props}>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Create your account</CardTitle>
              <CardDescription>
                Enter your email below to login to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        href="/reset"
                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                      >
                        Forgot your password?
                      </Link>
                    </div>
                    <Input id="password" type="password" value={password}
                      onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full">
                    Login
                  </Button>
                  <Button variant="outline" className="w-full">
                    Login with Google
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="underline underline-offset-4">
                    Sign up
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {message && <p className="mt-4 text-red-500">{message}</p>}
      </div>
    </div>
  )
}


// "use client";

// import { useState } from "react"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { signUpAction } from "@/app/actions"

// export default function PageSignUp() {
//   const [email, setEmail] = useState("")
//   const [password, setPassword] = useState("")
//   const [message, setMessage] = useState("")
//   const [loading, setLoading] = useState(false)

//   const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
//     event.preventDefault()
//     setLoading(true)

//     const formData = new FormData();
//     formData.append("email", email);
//     formData.append("password", password);

//     const result = await signUpAction(formData)

//     setLoading(false)

//     if (result.error) {
//       setMessage(result.error)
//     } else {
//       setMessage("Check your email for a confirmation link.")
//     }
//   };

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen">
//       <h1 className="text-2xl font-bold">Sign Up</h1>
//       <form onSubmit={handleSignUp} className="flex flex-col gap-2 mt-8">
//         <Label htmlFor="email">Email</Label>
//         <Input
//           type="email"
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//           placeholder="you@example.com"
//           required
//           className="mt-2 px-4 py-2 border rounded-md w-64"
//         />
//         <Label htmlFor="password">Password</Label>
//         <Input
//           type="password"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           placeholder="Your password"
//           required
//           className="mt-2 px-4 py-2 border rounded-md w-64"
//         />
//         <button
//           type="submit"
//           className={`mt-4 px-4 py-2 text-white rounded-md ${loading ? "bg-gray-400" : "bg-blue-600"}`}
//           disabled={loading} // Disable the button while loading
//         >
//           {loading ? "Loading..." : "Sign Up"}
//         </button>
//       </form>
//       {message && <p className="mt-4 text-red-500">{message}</p>} {/* Show message */}
//     </div>
//   );
// }
