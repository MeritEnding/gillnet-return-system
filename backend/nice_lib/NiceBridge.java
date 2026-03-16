import NiceID.Check.CPClient;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Set;

public class NiceBridge {
    public static void main(String[] args) {
        if (args.length < 3) {
            System.out.println("Usage: java NiceBridge [mode] [siteCode] [sitePw] [data]");
            return;
        }

        String mode = args[0]; // "ENC" or "DEC"
        String siteCode = args[1];
        String sitePw = args[2];
        String data = args[3];

        CPClient niceCheck = new CPClient();
        
        if ("ENC".equals(mode)) {
            // 암호화 (Request)
            int iReturn = niceCheck.fnEncode(siteCode, sitePw, data);
            if (iReturn == 0) {
                System.out.print("SUCCESS:" + niceCheck.getCipherData());
            } else {
                // 에러 메시지 메서드가 없으므로 에러 코드만 반환
                System.out.print("FAIL:" + iReturn);
            }
        } else if ("DEC".equals(mode)) {
            // 복호화 (Response)
            int iReturn = niceCheck.fnDecode(siteCode, sitePw, data);
            if (iReturn == 0) {
                String plainData = niceCheck.getPlainData();
                HashMap mapResult = niceCheck.fnParse(plainData);
                
                // 결과를 JSON 형태의 문자열로 직접 변환하여 출력
                StringBuilder json = new StringBuilder();
                json.append("{");
                
                Set keySet = mapResult.keySet();
                Iterator keys = keySet.iterator();
                
                while(keys.hasNext()){
                    String key = (String)keys.next();
                    String value = (String)mapResult.get(key);
                    
                    json.append("\"").append(key).append("\":\"").append(value).append("\"");
                    if(keys.hasNext()) json.append(",");
                }
                json.append("}");
                System.out.print("SUCCESS:" + json.toString());
            } else {
                // 에러 메시지 메서드가 없으므로 에러 코드만 반환
                System.out.print("FAIL:" + iReturn);
            }
        }
    }
}