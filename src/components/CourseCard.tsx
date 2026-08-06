import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Award, Users } from "lucide-react";
import DiscountCountdown from "@/components/DiscountCountdown";
import { formatEuro, getEffectivePrice } from "@/lib/pricing";

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  price: number;
  totalLessons: number;
  useCases?: number;
  imageUrl?: string;
  certificationEnabled?: boolean;
  discountPrice?: number | null;
  discountValidUntil?: string | null;
}

const CourseCard = ({
  id,
  title,
  description,
  price,
  totalLessons,
  useCases = 0,
  imageUrl = "/placeholder.svg",
  certificationEnabled = false,
  discountPrice = null,
  discountValidUntil = null,
}: CourseCardProps) => {
  const priceInfo = getEffectivePrice({
    price,
    discount_price: discountPrice,
    discount_valid_until: discountValidUntil,
  });

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="aspect-video w-full overflow-hidden bg-muted">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>
      
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-primary">{formatEuro(priceInfo.effective)}</span>
            {priceInfo.saleActive && (
              <span className="text-sm text-muted-foreground line-through">{formatEuro(priceInfo.base)}</span>
            )}
          </div>
          {priceInfo.saleActive && (
            <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/30">
              {priceInfo.validUntil ? (
                <>Ends in <DiscountCountdown until={priceInfo.validUntil} className="ml-1 font-semibold" /></>
              ) : (
                "Limited offer"
              )}
            </Badge>
          )}
        </div>
        <CardTitle className="line-clamp-2">{title}</CardTitle>
      </CardHeader>
      
      <CardContent>
        <div 
          className="text-sm text-muted-foreground line-clamp-2 mb-4 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: description }}
        />
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{totalLessons} lessons</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{useCases} Use Cases</span>
          </div>
          {certificationEnabled && (
            <div className="flex items-center gap-1">
              <Award className="h-4 w-4" />
              <span>Certificate</span>
            </div>
          )}
        </div>
        
        {certificationEnabled && (
          <div className="mt-3 pt-3 border-t">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/30 font-semibold">
              <Award className="h-3 w-3 mr-1" />
              Includes Certification Test Access
            </Badge>
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Link to={`/course/${id}`} className="w-full">
          <Button className="w-full">View Details</Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

export default CourseCard;
