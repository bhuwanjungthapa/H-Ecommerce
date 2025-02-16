// pages/admin/settings.tsx
import { AdminLayout } from "@/components/layout/admin-layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Setting } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";

export default function AdminSettingsPage() {
  const { toast } = useToast();

  // Fetch the single settings record
  const { data: settings, isLoading } = useQuery<Setting>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/settings");
      if (!res.ok) {
        throw new Error("Failed to fetch settings");
      }
      const data = await res.json();
      if (!data) {
        // Handle the case where no settings are returned
        throw new Error("No settings found");
      }
      return data;
    },
  });

  // Local state for form values
  const [formValues, setFormValues] = useState({
    siteName: "",
    siteEmail: "",
    contactNumber: "",
    whatsappNumber: "",
    currency: "",
  });

  // Initialize form values when settings load
  useEffect(() => {
    if (settings) {
      setFormValues({
        siteName: settings.siteName || "",
        siteEmail: settings.siteEmail || "",
        contactNumber: settings.contactNumber || "",
        whatsappNumber: settings.whatsappNumber || "",
        currency: settings.currency || "",
      });
    }
  }, [settings]);

  // Mutation to update settings (partial updates)
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<typeof formValues>) => {
      const res = await apiRequest("PATCH", "/api/settings", updates);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }
      return res.json(); // updated Setting object
    },
    onSuccess: (
      updatedSetting: Setting,
      variables: Partial<typeof formValues>
    ) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      const updatedField = Object.keys(variables)[0];
      const updatedValue = variables[updatedField as keyof typeof formValues];
      toast({
        title: "Setting Updated",
        description: `${
          updatedField.charAt(0).toUpperCase() + updatedField.slice(1)
        } updated to: ${updatedValue}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: String(error.message),
        variant: "destructive",
      });
    },
  });

  // Handler for updating a single field immediately
  const handleUpdateField = (field: keyof typeof formValues, value: string) => {
    updateMutation.mutate({ [field]: value });
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-lg font-medium">Loading settings...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-6 text-center">Site Settings</h2>
        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          {/* Site Name Field */}
          <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
            <Label className="md:col-span-1 text-right">Site Name:</Label>
            <Input
              className="md:col-span-2"
              value={formValues.siteName}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, siteName: e.target.value }))
              }
              placeholder="Enter site name"
            />
            <Button
              className="md:col-span-1"
              onClick={() => handleUpdateField("siteName", formValues.siteName)}
              disabled={updateMutation.isLoading}
            >
              Update
            </Button>
          </div>

          {/* Site Email Field */}
          <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
            <Label className="md:col-span-1 text-right">Site Email:</Label>
            <Input
              className="md:col-span-2"
              value={formValues.siteEmail}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  siteEmail: e.target.value,
                }))
              }
              placeholder="Enter site email"
            />
            <Button
              className="md:col-span-1"
              onClick={() =>
                handleUpdateField("siteEmail", formValues.siteEmail)
              }
              disabled={updateMutation.isLoading}
            >
              Update
            </Button>
          </div>

          {/* Contact Number Field */}
          <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
            <Label className="md:col-span-1 text-right">Contact Number:</Label>
            <Input
              className="md:col-span-2"
              value={formValues.contactNumber}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  contactNumber: e.target.value,
                }))
              }
              placeholder="Enter contact number"
            />
            <Button
              className="md:col-span-1"
              onClick={() =>
                handleUpdateField("contactNumber", formValues.contactNumber)
              }
              disabled={updateMutation.isLoading}
            >
              Update
            </Button>
          </div>

          {/* WhatsApp Number Field */}
          <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
            <Label className="md:col-span-1 text-right">WhatsApp Number:</Label>
            <Input
              className="md:col-span-2"
              value={formValues.whatsappNumber}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  whatsappNumber: e.target.value,
                }))
              }
              placeholder="Enter WhatsApp number"
            />
            <Button
              className="md:col-span-1"
              onClick={() =>
                handleUpdateField("whatsappNumber", formValues.whatsappNumber)
              }
              disabled={updateMutation.isLoading}
            >
              Update
            </Button>
          </div>

          {/* Currency Field */}
          <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
            <Label className="md:col-span-1 text-right">Currency:</Label>
            <Input
              className="md:col-span-2"
              value={formValues.currency}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  currency: e.target.value,
                }))
              }
              placeholder="Enter currency"
            />
            <Button
              className="md:col-span-1"
              onClick={() => handleUpdateField("currency", formValues.currency)}
              disabled={updateMutation.isLoading}
            >
              Update
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
