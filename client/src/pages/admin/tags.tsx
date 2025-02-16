// pages/admin/tags.tsx
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tag, insertTagSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

type TagFormData = {
  name: string;
  slug: string;
};

export default function AdminTags() {
  const { toast } = useToast();
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const form = useForm<TagFormData>({
    resolver: zodResolver(insertTagSchema),
    defaultValues: { name: "", slug: "" },
  });

  // GET all tags
  const { data: tags, isLoading } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/tags");
      if (!res.ok) {
        throw new Error("Failed to fetch tags");
      }
      return res.json();
    },
  });

  // POST a new tag
  const createMutation = useMutation({
    mutationFn: async (payload: TagFormData) => {
      const res = await apiRequest("POST", "/api/tags", payload);
      if (!res.ok) {
        // If we get a 409, handle it
        if (res.status === 409) {
          const body = await res.json();
          throw new Error(body.error || "Conflict: Tag already exists");
        }
        const errText = await res.text();
        throw new Error(errText);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      setIsFormDialogOpen(false);
      form.reset();
      toast({ title: "Success", description: "Tag created." });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: String(error.message),
        variant: "destructive",
      });
    },
  });

  // PATCH update tag
  const updateMutation = useMutation({
    mutationFn: async (payload: TagFormData & { id: number }) => {
      const res = await apiRequest("PATCH", `/api/tags/${payload.id}`, payload);
      if (!res.ok) {
        if (res.status === 409) {
          const body = await res.json();
          throw new Error(body.error || "Conflict: Tag already exists");
        }
        const errText = await res.text();
        throw new Error(errText);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      setIsFormDialogOpen(false);
      setSelectedTag(null);
      form.reset();
      toast({ title: "Success", description: "Tag updated." });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: String(error.message),
        variant: "destructive",
      });
    },
  });

  // DELETE tag
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/tags/${id}`);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      setIsDeleteDialogOpen(false);
      setSelectedTag(null);
      toast({ title: "Success", description: "Tag deleted." });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: String(error.message),
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: TagFormData) => {
    if (selectedTag) {
      await updateMutation.mutateAsync({ ...data, id: selectedTag.id });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleEdit = (tag: Tag) => {
    setSelectedTag(tag);
    form.reset({ name: tag.name, slug: tag.slug });
    setIsFormDialogOpen(true);
  };

  const handleDelete = (tag: Tag) => {
    setSelectedTag(tag);
    setIsDeleteDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Tags</h2>
          <Button onClick={() => setIsFormDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Tag
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags?.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell>{tag.name}</TableCell>
                  <TableCell>{tag.slug}</TableCell>
                  <TableCell>
                    {new Date(tag.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(tag)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(tag)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && tags?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No tags found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedTag ? "Edit Tag" : "Add Tag"}</DialogTitle>
              <DialogDescription>Enter tag details below</DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...form.register("name")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" {...form.register("slug")} />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsFormDialogOpen(false);
                    setSelectedTag(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {selectedTag ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Tag</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-medium">{selectedTag?.name}</span>? This
                action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setSelectedTag(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedTag) {
                    deleteMutation.mutate(selectedTag.id);
                  }
                }}
              >
                {deleteMutation.isLoading ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
