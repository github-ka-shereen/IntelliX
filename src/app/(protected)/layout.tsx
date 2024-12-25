import { SidebarProvider } from "@/components/ui/sidebar";
import { UserButton } from "@clerk/nextjs";
import React from "react";
import AppSidebar from "./dashboard/app-sidebar";
import { Card } from "@/components/ui/card";

type Props = {
  children: React.ReactNode;
};

const SideBarLayout = ({ children }: Props) => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="m-2 w-full">
        <div className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar p-2 px-4 shadow-md">
          {/* <SearchBar/> */}
          <div className="ml-auto"></div>
          <UserButton />
        </div>
        <div className="h-4"></div>
        {/* main content */}
        <Card className="hide-scrollbar h-[calc(100vh-10rem)] overflow-auto p-4">
          {children}
        </Card>
      </main>
    </SidebarProvider>
  );
};

export default SideBarLayout;
