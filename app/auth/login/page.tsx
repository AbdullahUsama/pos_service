import { LoginForm } from "@/components/login-form";
import { SimpleThemeToggle } from "@/components/simple-theme-toggle";

export default function Page() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 md:p-6 bg-background">
      <div className="absolute top-4 right-4">
        <SimpleThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}
