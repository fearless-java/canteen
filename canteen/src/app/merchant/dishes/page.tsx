'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, UtensilsCrossed } from 'lucide-react';
import { ImageUpload } from '@/components/common/ImageUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface Dish {
  id: string;
  name: string;
  description?: string;
  price: string;
  image?: string;
  isAvailable: boolean;
  avgRating: string;
  totalReviews: number;
}

interface Stall {
  id: string;
  name: string;
}

export default function MerchantDishesPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    image: '',
    isAvailable: true,
  });

  // 获取商家档口信息
  const { data: stall } = useQuery<Stall>({
    queryKey: ['merchant', 'stall'],
    queryFn: async () => {
      const res = await fetch('/api/merchant/stall');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '请求失败');
      return json.data ?? null;
    },
  });

  const { data: dishes, isLoading } = useQuery<Dish[]>({
    queryKey: ['merchant', 'dishes'],
    queryFn: async () => {
      const res = await fetch('/api/merchant/dishes');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '请求失败');
      return json.data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!stall?.id) {
        throw new Error('档口信息加载中');
      }
      const res = await fetch('/api/dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          stallId: stall.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || '创建失败');
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'dishes'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      alert(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const res = await fetch(`/api/dishes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          price: data.price,
          image: data.image,
          isAvailable: data.isAvailable,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || '更新失败');
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'dishes'] });
      setIsDialogOpen(false);
      setEditingDish(null);
      resetForm();
    },
    onError: (error: Error) => {
      alert(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dishes/${id}`, { method: 'DELETE' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'dishes'] });
    },
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', price: '', image: '', isAvailable: true });
  };

  const handleEdit = (dish: Dish) => {
    setEditingDish(dish);
    setFormData({
      name: dish.name,
      description: dish.description || '',
      price: dish.price,
      image: dish.image || '',
      isAvailable: dish.isAvailable,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingDish) {
      updateMutation.mutate({ id: editingDish.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingDish(null);
      resetForm();
    }
  };

  if (isLoading || !stall) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-24" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">菜品列表</h2>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              添加菜品
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDish ? '编辑菜品' : '添加菜品'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <Label>菜品名称</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="菜品名称"
                />
              </div>

              <div>
                <Label>价格</Label>
                <Input
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="例如: 18.00"
                />
              </div>

              <div>
                <Label>介绍</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="菜品介绍"
                  rows={2}
                />
              </div>

              <div>
                <Label>菜品图片</Label>
                <ImageUpload
                  images={formData.image ? [formData.image] : []}
                  onChange={(images) => setFormData({ ...formData, image: images[0] || '' })}
                  maxImages={1}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isAvailable}
                  onCheckedChange={(checked: boolean) =>
                    setFormData({ ...formData, isAvailable: checked })
                  }
                />
                <Label>在售</Label>
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={!formData.name || !formData.price || createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? '处理中...' : editingDish ? '保存修改' : '添加菜品'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {dishes?.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>暂无菜品</p>
          </div>
        ) : (
          dishes?.map((dish, index) => (
            <motion.div
              key={dish.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {dish.image && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                          <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{dish.name}</h3>
                          {!dish.isAvailable && (
                            <Badge variant="secondary">售罄</Badge>
                          )}
                        </div>

                        {dish.description && (
                          <p className="text-sm text-gray-500 mt-1">{dish.description}</p>
                        )}

                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-red-500 font-bold">¥{dish.price}</span>
                          <span className="text-gray-500">{dish.totalReviews} 评价</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(dish)}>
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(dish.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
