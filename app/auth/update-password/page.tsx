import { UpdatePasswordForm } from "@/components/update-password-form";
import { SimpleThemeToggle } from "@/components/simple-theme-toggle";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-background">
      <div className="absolute top-4 right-4">
        <SimpleThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
