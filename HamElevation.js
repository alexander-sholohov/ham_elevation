//
// This libray can show elevation chart on canvas element
//
// Developed by Alexander Sholohov <ra9yer@yahoo.com>
// github repository: https://github.com/alexander-sholohov/ham_elevation
// MIT license: http://choosealicense.com/licenses/mit/

//----------------------------------------------------------------
function angleBetweenPoints(p1, p2)
{
    // grad->rad
    var lat1 = p1.lat * Math.PI / 180;
    var lat2 = p2.lat * Math.PI / 180;
    var long1 = p1.lng * Math.PI / 180;
    var long2 = p2.lng * Math.PI / 180;
 
    // 
    var cl1 = Math.cos(lat1);
    var cl2 = Math.cos(lat2);
    var sl1 = Math.sin(lat1);
    var sl2 = Math.sin(lat2);
    var delta = long2 - long1;
    var cdelta = Math.cos(delta);
    var sdelta = Math.sin(delta);
 
    // 
    var y = Math.sqrt(Math.pow(cl2 * sdelta, 2) + Math.pow(cl1 * sl2 - sl1 * cl2 * cdelta, 2));
    var x = sl1 * sl2 + cl1 * cl2 * cdelta;
 
    //
    var ad = Math.atan2(y, x);    
    return ad;
}



//----------------------------------------------------------------
function calcElevationStatistic(chartData, ang, earthRadius)
{
    var angDiv2 = ang / 2.0;
    var earthArcShift = earthRadius * Math.cos(angDiv2);
    var numPoints = chartData.length;
    var stepAngl = ang / numPoints;

    var summ = 0.0;

    var minSimple = 0.0;
    var maxSimple = 0.0;

    var minEarth = 0.0;
    var maxEarth = 0.0;

    for(var i=0; i<numPoints; i++)
    {
        var a1 = (i - numPoints/2 ) * stepAngl;
        var earthArc1 = earthRadius * Math.cos(a1);
        var earthArc2 = earthArc1 - earthArcShift;

        var elSimple = chartData[i].elevation; 
        var elEarth = chartData[i].elevation + earthArc2; 

        summ += elSimple;

        if( i==0 ) 
        {
            minSimple = elSimple;
            maxSimple = elSimple;

            minEarth = elEarth;
            maxEarth = elEarth;
        }
        else
        {
            if( elSimple > maxSimple) { maxSimple = elSimple;}
            if( elSimple < minSimple) { minSimple = elSimple;}

            if( elEarth > maxEarth) { maxEarth = elEarth;}
            if( elEarth < minEarth) { minEarth = elEarth;}
        }

    }

    var avg = (chartData.length > 0)? summ / chartData.length : 0;

    res = {}
    res.minSimple = minSimple;
    res.maxSimple = maxSimple;
    res.minEarth = minEarth;
    res.maxEarth = maxEarth;
    res.avg = avg;

    return res;
}


//----------------------------------------------------------------
function drawEndpoint2(ctx, p1, scaleH, x, y, ang, downShift)
{
    var h1 = (p1.elevation - downShift) * scaleH;
    var h2 = (p1.elevation + p1.antennaElevation - downShift) * scaleH;


    ctx.save();
    ctx.translate(x + 0.5, y);
    ctx.rotate(ang);
    ctx.scale(1, -1);

    ctx.beginPath();
    ctx.strokeStyle = "rgb(0,0,0)";
    ctx.lineWidth = 1;
    ctx.moveTo(0, 0);
    ctx.lineTo(0, h1);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = "rgb(0,0,200)";
    ctx.lineWidth = 1;

    ctx.moveTo( -4, h1);
    ctx.lineTo(0, h2);
    ctx.lineTo( +4, h1);
    ctx.closePath();

    ctx.stroke();


    ctx.restore();
}


//----------------------------------------------------------------
function drawLinkBetweenAntennas(ctx, p1, p2, scaleH, centerX, centerY, halfway, ang, downShift)
{
    var el1 = (p1.elevation + p1.antennaElevation - downShift) * scaleH;
    var el2 = (p2.elevation + p2.antennaElevation - downShift) * scaleH;   

    var x1 = centerX - halfway - el1 * Math.sin(ang);
    var y1 = centerY - el1 * Math.cos(ang);

    var x2 = centerX + halfway + el2 * Math.sin(ang);
    var y2 = centerY - el2 * Math.cos(ang);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgb(0,0,0)';

    ctx.stroke();
    ctx.restore();
}

//----------------------------------------------------------------
function drawEarthArc(ctx, centerX, centerY, halfway, height)
{
    ctx.beginPath();
    var shiftX = halfway * 0.2;
    var shiftY = 0;

    // this two cubic bezier curves very close to arc
    // TODO: improve for long rang
    
    var kA = 0.4;
    var kB = 0.5;
    var kC = 0.8;
    
    var cpA1x = centerX - halfway * kC;
    var cpA1y = centerY - height * kA;
    var cpB1x = centerX - halfway * kB;
    var cpB1y = centerY - height * 1;

    var cpA2x = centerX + halfway * kC;
    var cpA2y = centerY - height * kA;
    var cpB2x = centerX + halfway * kB;
    var cpB2y = centerY - height * 1;

    ctx.moveTo(centerX-halfway, centerY);
    ctx.bezierCurveTo(cpA1x, cpA1y,      cpB1x, cpB1y,    centerX, centerY-height);
    ctx.bezierCurveTo(cpB2x, cpB2y,      cpA2x, cpA2y,    centerX+halfway, centerY);

    ctx.lineWidth = 2;

    // line color
    ctx.strokeStyle = '#0000DD';
    ctx.stroke();    

}



//----------------------------------------------------------------
function drawElevationShape(ctx, p1, p2, chartData, scaleH, centerX, centerY, halfway, ang, earthRadius, downShift, useEarthArc, drawEarhArc)
{

    var angDiv2 = ang / 2.0;
    var earthArcShift = earthRadius * Math.cos(angDiv2);

    var numPoints = chartData.length;
    var stepX =  halfway * 2 / numPoints;
    var stepAngl = ang / numPoints;

    var naklonX1 = p1.elevation * 1 * scaleH;
    var naklonX2 = p2.elevation * 1 * scaleH;


    ctx.save();


    // draw earth surface (not used)
    if( drawEarhArc )
    {
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#660000';
        for(var i=0; i<numPoints; i++)
        {
            var a1 = (i - numPoints/2 ) * stepAngl;
            var earthArc1 = earthRadius * Math.cos(a1);
            var earthArc2 = (earthArc1 - earthArcShift) * scaleH;

            var x = (centerX - halfway) + stepX * i;
            var y = centerY - earthArc2;
            if( i== 0 )
            {
                ctx.moveTo(x, y);
            }
            else
            {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();    
    }


    // draw elevation chart
    ctx.beginPath();
    var prevX = 0;
    var prevY = 0;
    for(var i=0; i<numPoints; i++)
    {
        var a1 = (i - numPoints/2 ) * stepAngl;
        var deltaH = 0;
        if( useEarthArc )
        {
            var earthArc1 = earthRadius * Math.cos(a1);
            deltaH = (earthArc1 - earthArcShift) ;
        }

        var correctionX = 0;
        if( i < numPoints / 2)
        {
            correctionX = naklonX1 * Math.sin(a1);
        }
        else
        {
            correctionX = naklonX2 * Math.sin(a1);
        }

        var elevation1 = chartData[i].elevation - downShift;
        var elevation2 = (elevation1 + deltaH ) * scaleH;

        var x = (centerX - halfway) + stepX * i + correctionX;
        var y = centerY - elevation2;
        if( i== 0 )
        {
            ctx.moveTo(x, y);
            prevX = x;
            prevY = y;
        }
        else
        {
            ctx.lineTo(x, y);

            var miny = Math.max(prevY, y);

            ctx.fillStyle = "rgba(20,20,0, 0.2)"
            ctx.fillRect(x, miny, prevX - x, centerY - miny );
            prevX = x;
            prevY = y;

        }
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#330000';
    ctx.stroke();    


    ctx.restore();


}


//----------------------------------------------------------------
function findAppropriateChartMeshParam(screenSize, realSize, numLines)
{
    res = {};

    var scaleFactor = screenSize / realSize;

    var x1 = realSize / numLines;
    var x2 = x1;
    var d = 1;
    var cnt = 0;

    while( x2 > 10)
    {
        x2 = x2 / 10;
        d *= 10;
        cnt += 1;
    }

    if( cnt > 0)
    {
        var x3 = Math.floor(x2);
        res.realStepSize = x3 * d;
        res.screenStepSize = res.realStepSize * scaleFactor;
        res.numLines = Math.ceil(screenSize / res.screenStepSize);  //  ceil?
        if( res.numLines > numLines * 1.5)
        {
            res.realStepSize *= 1.5;
            res.screenStepSize = res.realStepSize * scaleFactor;
            res.numLines = Math.ceil(screenSize / res.screenStepSize);
        }
        res.digitsAfterPoint = 0;
    }
    else
    {
        res.screenStepSize = screenSize / numLines;
        res.realStepSize = realSize / numLines;
        res.numLines = numLines;
        res.digitsAfterPoint = 1;
    }

    return res;
}

//----------------------------------------------------------------
function drawMesh(ctx, ipX, ipY, iW, iH, scaleH, distance, cntrW, antennaPosFromCenter, downShift)
{
    var resH = findAppropriateChartMeshParam(iH, iH / scaleH, 10);
    var screenStepH = resH.screenStepSize;
    var realStepH = resH.realStepSize;
    var numLinesH2 = resH.numLines;

    // horisontal mesh
    ctx.beginPath();
    ctx.textAlign = "end";
    ctx.textBaseline = "bottom";    
    ctx.font = "12px serif";
    ctx.fillStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#CCCCCC';

    for( var i=0; i<numLinesH2; i++)
    {
        var y = Math.floor(ipY - i*screenStepH) + 0.5;
        ctx.moveTo(ipX-3, y);
        ctx.lineTo(ipX+iW, y);
        if(true)
        {
            var v = i * realStepH + downShift;
            ctx.fillText(v.toFixed(resH.digitsAfterPoint), ipX-3, y + 5);
        }

    }
    ctx.stroke();    

    // vertical  mesh
    var resV = findAppropriateChartMeshParam(antennaPosFromCenter*2, distance, 10);
    var screenStepV = resV.screenStepSize;
    var realStepV = resV.realStepSize;
    var numLinesV2 = resV.numLines;

    ctx.beginPath();
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";    
    ctx.font = "12px serif";
    ctx.fillStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#CCCCCC';

    var leftOrigin = cntrW - antennaPosFromCenter;

    for( var i=0; i<numLinesV2; i++)
    {
        var x = Math.floor(leftOrigin + i*screenStepV) + 0.5;
        ctx.moveTo(x, ipY + 2);
        ctx.lineTo(x, ipY - iH);
        var v = i * realStepV / 1000;
        var t = v.toFixed( (distance < 12)? 1 : 0 ) + " km";
        ctx.fillText(t, x, ipY + 15);

    }
    ctx.stroke();    


}

//----------------------------------------------------------------
function drawChart(context, p1, p2, chartData, useEarthArc, useFullElevation)
{
    var clientW = context.canvas.clientWidth;
    var clientH = context.canvas.clientHeight;

    var EARTH_RADIUS = 6372795;
    var ang = angleBetweenPoints(p1, p2);
    var horda = 2 * EARTH_RADIUS * Math.sin(ang / 2.0);
    var distance = ang * EARTH_RADIUS;
    var h = EARTH_RADIUS * (1 - Math.cos(ang/2.0) );
    var virtualAng = (ang < 0.05)? 0.0 : ang;  // ignore small angle


    // clear screen + draw border
    context.beginPath();
    context.rect(0, 0, clientW, clientH);
    context.fillStyle = '#f0f0f0';
    context.fill();
    context.lineWidth = 1;
    context.strokeStyle = 'black';
    context.stroke();    

    var marginLeft = 60;
    var marginTop = 15;
    var marginRight = 15;
    var marginBottom = 20;

    var ipX = marginLeft;
    var ipY = clientH - marginBottom;
    var iW = clientW - marginLeft - marginRight;
    var iH = clientH - marginBottom - marginTop;

    // draw white field
    context.beginPath();
    context.rect(ipX, ipY, iW, -iH);
    context.fillStyle = '#ffffff';
    context.fill();

    if( !(chartData && chartData.length>1) )
    {
        return;
    }


    var el1 = p1.elevation + p1.antennaElevation;
    var el2 = p2.elevation + p2.antennaElevation;   
    var elMax = Math.max(el1, el2);
    var anglDiv2 = virtualAng / 2.0;
    var antennaShift = elMax * Math.sin(anglDiv2);

    // calc scale
    var elevationStat = calcElevationStatistic(chartData, ang, EARTH_RADIUS);
    var avgElevation = elevationStat.avg;

    var posMin = Math.min(p1.elevation, p2.elevation, elevationStat.minSimple);
    var posMax = Math.max(p1.elevation + p1.antennaElevation, p2.elevation + p2.antennaElevation, elevationStat.maxEarth);

    var downShift = (useFullElevation)? 0 : Math.floor(posMin / 100.0) * 100 ;
    var fitPercent = (useFullElevation)? 0.8 : 0.95;
    var scaleH =  fitPercent * iH / ( posMax - downShift )  ;


    var antennaPadding = 20;
    var antennaPosFromCenter = iW / 2 - (antennaPadding + antennaShift*scaleH);
    var cntrW = ipX + iW / 2 ;


    // draw mesh
    drawMesh(context, ipX, ipY, iW, iH, scaleH, distance, cntrW, antennaPosFromCenter, downShift);


    context.save();
    context.beginPath();
    context.rect(ipX, ipY, iW, -iH); // define clip region
    context.clip();


    drawEndpoint2(context, p1, scaleH, cntrW - antennaPosFromCenter, ipY, -1 * anglDiv2, downShift);
    drawEndpoint2(context, p2, scaleH, cntrW + antennaPosFromCenter, ipY, 1 * anglDiv2, downShift);

    drawLinkBetweenAntennas(context, p1, p2, scaleH, cntrW, ipY, antennaPosFromCenter, anglDiv2, downShift);
    
    if( useEarthArc )
    {
        drawEarthArc(context, cntrW, ipY, antennaPosFromCenter, h * scaleH);
    }

    drawElevationShape(context, p1, p2, chartData, scaleH, cntrW, ipY, antennaPosFromCenter, ang, EARTH_RADIUS, downShift, useEarthArc, false);

    context.restore();


}
