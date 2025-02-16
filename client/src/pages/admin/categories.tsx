// pages/admin/categories.tsx
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Category, Tag, insertCategorySchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";

type CategoryFormData = z.infer<typeof insertCategorySchema> & {
  tags?: number[];
};

export default function AdminCategories() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<
    Category[]
  >({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/categories");
      if (!res.ok) {
        throw new Error("Failed to fetch categories");
      }
      return res.json();
    },
  });

  const { data: tags = [], isLoading: isLoadingTags } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/tags");
      if (!res.ok) {
        throw new Error("Failed to fetch tags");
      }
      return res.json();
    },
  });

  // Reset form
  const resetForm = () => {
    setSelectedCategory(null);
    setSelectedTags([]);
    form.reset({
      name: "",
      slug: "",
    });
  };

  // Clear form on close
  useEffect(() => {
    if (!isFormDialogOpen) {
      resetForm();
    }
  }, [isFormDialogOpen]);

  // Create category
  const createMutation = useMutation({
    mutationFn: async (payload: CategoryFormData) => {
      // We can pass `tags: selectedTags` in the same POST body:
      const res = await apiRequest("POST", "/api/categories", {
        ...payload,
        tags: selectedTags,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Error creating category");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsFormDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Category created successfully",
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

  // Update category
  const updateMutation = useMutation({
    mutationFn: async (payload: CategoryFormData & { id: number }) => {
      const res = await apiRequest("PATCH", `/api/categories/${payload.id}`, {
        ...payload,
        tags: selectedTags,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Error updating category");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsFormDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Category updated successfully",
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

  // Delete category
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/categories/${id}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Error deleting category");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsDeleteDialogOpen(false);
      setSelectedCategory(null);
      toast({
        title: "Success",
        description: "Category deleted successfully",
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

  // Submit
  const onSubmit = async (data: CategoryFormData) => {
    if (selectedCategory) {
      await updateMutation.mutateAsync({ ...data, id: selectedCategory.id });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  // Edit
  const handleEdit = async (cat: Category) => {
    resetForm();
    setSelectedCategory(cat);

    // fetch category tags => returns array of {id, name, slug}
    try {
      const res = await apiRequest("GET", `/api/category-tags/${cat.id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch category tags");
      }
      const categoryTags = await res.json();
      setSelectedTags(categoryTags.map((t: any) => t.id));
    } catch (error) {
      console.error("Error fetching category tags:", error);
      setSelectedTags([]);
    }

    // set form
    form.reset({
      name: cat.name,
      slug: cat.slug,
    });
    setIsFormDialogOpen(true);
  };

  // Delete
  const handleDelete = (cat: Category) => {
    setSelectedCategory(cat);
    setIsDeleteDialogOpen(true);
  };

  // Toggle tag selection
  const handleTagToggle = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  if (isLoadingCategories || isLoadingTags) {
    return (
      <AdminLayout>
        <p>Loading...</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Categories</h2>
          <Button
            onClick={() => {
              resetForm();
              setIsFormDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell>{cat.name}</TableCell>
                  <TableCell>{cat.slug}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {cat.tags?.map((tag) => (
                        <Badge key={tag.id} variant="secondary">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(cat.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(cat)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(cat)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoadingCategories && categories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No categories found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Form Dialog */}
        <Dialog
          open={isFormDialogOpen}
          onOpenChange={(open) => {
            if (!open) resetForm();
            setIsFormDialogOpen(open);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedCategory ? "Edit Category" : "Add Category"}
              </DialogTitle>
              <DialogDescription>
                Enter the details for the category
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" {...form.register("slug")} />
                {form.formState.errors.slug && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.slug.message}
                  </p>
                )}
              </div>

              {/* Tag Selection */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={
                        selectedTags.includes(tag.id) ? "default" : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() => handleTagToggle(tag.id)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setIsFormDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isLoading || updateMutation.isLoading
                  }
                >
                  {selectedCategory ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Category</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-medium">{selectedCategory?.name}</span>?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setSelectedCategory(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isLoading}
                onClick={() => {
                  if (selectedCategory) {
                    deleteMutation.mutate(selectedCategory.id);
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
