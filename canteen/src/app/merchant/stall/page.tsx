'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Edit, Save, Store, ImageIcon } from 'lucide-react';
import { ImageUpload } from '@/components/common/ImageUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface Stall {
  id: string;
  name: string;
  description: string;
  image?: string;
  isActive: boolean;
  avgRating: string;
  totalReviews: number;
  totalViews: number;
  cafeteria: { name: string };
}

export default function MerchantStallPage() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    isActive: true,
  });

  const { data: stall, isLoading } = useQuery<Stall>({
    queryKey: ['merchant', 'stall'],
    queryFn: async () => {
      const res = await fetch('/api/merchant/stall');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '请求失败');
      return json.data ?? null;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch(`/api/stalls/${stall?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'stall'] });
      setIsEditing(false);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  if (!stall) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">暂无档口信息</p>
      </div>
    );
  }

  const handleEdit = () => {
    setFormData({
      name: stall.name,
      description: stall.description,
      image: stall.image || '',
      isActive: stall.isActive,
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="h-5 w-5" />
                档口信息
              </CardTitle>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-1" />
                  编辑
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {updateMutation.isPending ? '保存中...' : '保存'}
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div>
                  <Label>档口名称</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="档口名称"
                  />
                </div>
                
                <div>
                  <Label>档口介绍</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="档口介绍"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>档口图片</Label>
                  <ImageUpload
                    images={formData.image ? [formData.image] : []}
                    onChange={(images) => setFormData({ ...formData, image: images[0] || '' })}
                    maxImages={1}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, isActive: checked })
                    }
                  />
                  <Label>营业中</Label>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                    {stall.image ? (
                      <img src={stall.image} alt={stall.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">{stall.name}</h3>
                      <Badge variant={stall.isActive ? 'default' : 'secondary'}>
                        {stall.isActive ? '营业中' : '休息中'}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 mt-1">{stall.description}</p>
                    
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <span>{stall.cafeteria.name}</span>
                      <span>·</span>
                      <span>{stall.totalViews} 浏览</span>
                      <span>·</span>
                      <span>{stall.totalReviews} 评价</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
